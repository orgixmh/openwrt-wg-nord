'use strict';
'require view';
'require form';
'require fs';
'require ui';
'require uci';
'require poll';

var STATUS_FILE = '/var/run/nordvpn.status';
var STATUS_JSON_FILE = '/var/run/nordvpn-ui.json';
var LOG_FILE = '/var/log/nordvpn.log';

function renderActionButton(title, cmd, args) {
	return E('button', {
		'class': 'btn cbi-button cbi-button-action',
		'click': ui.createHandlerFn(this, function() {
			ui.addNotification(null, E('p', _('Running: %s').format(title)), 'info');

			return fs.exec(cmd, args || []).then(function() {
				ui.addNotification(null, E('p', _('Command completed.')), 'info');
			}).catch(function(err) {
				ui.addNotification(null, E('p', _('Command failed: %s').format(err.message || err)), 'danger');
			});
		})
	}, [ title ]);
}

function parseFallbackStatus(text) {
	var t = (text || '').trim();
	var info = {
		state: 'disconnected',
		server: '',
		applied_interfaces: [],
	};

	if (!t)
		return info;

	if (t.match(/connected/i)) {
		info.state = 'connected';
		var m1 = t.match(/connected to ([^\s]+)/i);
		if (m1 && m1[1])
			info.server = m1[1];
	}
	else if (t.match(/connecting/i)) {
		info.state = 'connecting';
		var m2 = t.match(/connecting to ([^\s]+)/i);
		if (m2 && m2[1])
			info.server = m2[1];
	}
	else {
		info.state = 'disconnected';
	}

	return info;
}

function readStatusInfo() {
	return fs.read(STATUS_JSON_FILE).then(function(res) {
		try {
			var data = JSON.parse(res);
			return {
				state: data.state || 'disconnected',
				server: data.server || '',
				applied_interfaces: Array.isArray(data.applied_interfaces) ? data.applied_interfaces : [],
			};
		}
		catch (e) {
			return fs.read(STATUS_FILE).then(function(txt) {
				return parseFallbackStatus(txt);
			}).catch(function() {
				return parseFallbackStatus('');
			});
		}
	}).catch(function() {
		return fs.read(STATUS_FILE).then(function(txt) {
			return parseFallbackStatus(txt);
		}).catch(function() {
			return parseFallbackStatus('');
		});
	});
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('nordvpn'),
			uci.load('network')
		]);
	},

	render: function() {
		var m, s, o;
		var ifaceSections = uci.sections('network', 'interface') || [];

		var smallLineStyle = 'font-size:12px; opacity:0.85; margin-bottom:6px; background:transparent;';
		var smallLineLastStyle = 'font-size:12px; opacity:0.85; margin-bottom:0; background:transparent;';

		var pageDescription = E('div', {
			'style': 'margin:6px 0 16px 0;'
		}, _('Unofficial NordVPN WireGuard integration for OpenWrt. Configure the connection, choose the interfaces that should use the VPN tunnel, and monitor status and logs.'));

		var statusTitleNode = E('div', {
			'style': 'font-size:18px; font-weight:600; margin-bottom:4px; background:transparent;'
		}, _('Loading status...'));

		var statusSubNode = E('div', {
			'style': smallLineStyle
		}, _('Loading interface information...'));


		var statusBox = E('div', {
			'class': 'cbi-section',
			'style': 'padding:16px; border-radius:8px; margin-bottom:16px; border-left:6px solid #b00; var(--warn-color-low)'
		}, [
			statusTitleNode,
			statusSubNode
		]);

		var logNode = E('pre', {
			'style': 'padding:1em; background:#111; color:#ddd; overflow:auto; min-height:260px; border-radius:6px; margin:0;'
		}, _('Log file not available yet.'));

		var debugOutputNode = E('pre', {
			'style': 'padding:1em; background:#111; color:#ddd; overflow:auto; min-height:180px; border-radius:6px; margin-top:10px;'
		}, _('No debug output yet.'));

		m = new form.Map('nordvpn', _('NordVPN WireGuard'));

		s = m.section(form.TypedSection, 'main', _('Configuration'));
		s.anonymous = true;
		s.addremove = false;

		s.tab('general', _('General'));
		s.tab('routing', _('Routing'));
		s.tab('logs', _('Logs'));

		o = s.taboption('general', form.Flag, 'enabled', _('Enable VPN integration'));
		o.rmempty = false;
		o.description = _('Enable or disable the NordVPN integration on this router.');

		o = s.taboption('general', form.Value, 'token', _('NordVPN token'));
		o.password = true;
		o.rmempty = false;
		o.description = _('Enter your NordVPN access token. The value is masked in the LuCI interface.');

		o = s.taboption('general', form.DynamicList, 'server', _('Preferred servers'));
		o.placeholder = 'si14.nordvpn.com';
		o.rmempty = false;
		o.description = _('Select one or more preferred NordVPN servers. You can add custom server hostnames or remove existing ones.');
		o.datatype = 'host';
		o.value('si14.nordvpn.com', 'si14.nordvpn.com');
		o.value('de945.nordvpn.com', 'de945.nordvpn.com');
		o.value('us8421.nordvpn.com', 'us8421.nordvpn.com');
		o.value('nl166.nordvpn.com', 'nl166.nordvpn.com');

		o = s.taboption('general', form.Flag, 'auto_refresh', _('Automatic refresh'));
		o.rmempty = false;
		o.description = _('Automatically refresh the generated VPN configuration at a fixed interval.');

		o = s.taboption('general', form.Value, 'refresh_days', _('Refresh interval (days)'));
		o.datatype = 'uinteger';
		o.placeholder = '3';
		o.depends('auto_refresh', '1');
		o.description = _('How often the router should refresh the generated NordVPN configuration.');

		o = s.taboption('general', form.Flag, 'auto_connect', _('Connect automatically'));
		o.rmempty = false;
		o.description = _('Automatically connect the VPN when the service starts.');

		var actionsPlaceholderId = 'nordvpn-general-actions';
		o = s.taboption('general', form.DummyValue, '_general_actions', _('Actions'));
		o.rawhtml = true;
		o.description = _('Manual connection control for the NordVPN tunnel.');
		o.cfgvalue = function() {
			return '<div id="' + actionsPlaceholderId + '"></div>';
		};

		o = s.taboption('routing', form.MultiValue, 'target_interfaces', _('Target interfaces'));
		o.widget = 'checkbox';
		o.description = _('Select the OpenWrt interfaces that should be routed through the NordVPN tunnel.');

		ifaceSections.forEach(function(iface) {
			var name = iface['.name'];
			if (!name || name === 'loopback' || name === 'nordvpn')
				return;
			o.value(name, name);
		});

		var logsPlaceholderId = 'nordvpn-log-pane';
		o = s.taboption('logs', form.DummyValue, '_logs_view', _('Logs'));
		o.rawhtml = true;
		o.description = _('Live output from the backend log file.');
		o.cfgvalue = function() {
			return '<div id="' + logsPlaceholderId + '"></div>';
		};

		var debugPlaceholderId = 'nordvpn-debug-pane';
		o = s.taboption('logs', form.DummyValue, '_debug_view', _('Debug'));
		o.rawhtml = true;
		o.description = _('Manual maintenance actions for configuration generation and refresh.');
		o.cfgvalue = function() {
			return '<div id="' + debugPlaceholderId + '"></div>';
		};

		function updateStatusBox() {
			return readStatusInfo().then(function(info) {
				var state = (info.state || 'disconnected').toLowerCase();
				var server = info.server || '';
				var ifaces = (info.applied_interfaces || []).filter(Boolean);

				if (state === 'connected') {
					statusBox.style.borderLeftColor = '#4caf50';
					statusBox.style.background = 'var(--success-color-low)';
					statusTitleNode.textContent = server ?
						_('Connected to %s').format(server) :
						_('Connected');
				}
				else if (state === 'connecting') {
					statusBox.style.borderLeftColor = '#d9a300';
					statusBox.style.background = 'var(--warn-color-low)';
					statusTitleNode.textContent = server ?
						_('Connecting to %s').format(server) :
						_('Connecting');
				}
				else {
					statusBox.style.borderLeftColor = '#d9534f';
					statusBox.style.background = 'var(--error-color-low)';
					statusTitleNode.textContent = _('Disconnected');
				}

				statusSubNode.textContent = ifaces.length > 0 ?
					_('Applied to: %s').format(ifaces.join(', ')) :
					_('No interfaces configured.');

			});
		}

		function updateLogs() {
			return fs.read(LOG_FILE).then(function(res) {
				logNode.textContent = (res || '').trim() || _('Log file is empty.');
			}).catch(function() {
				logNode.textContent = _('Log file not available yet.');
			});
		}

		return m.render().then(function(mapEl) {
			var root = E([], [
				mapEl
			]);

			window.setTimeout(function() {
				var mapTitle = mapEl.querySelector('.cbi-map-title, h2');
				if (mapTitle && mapTitle.parentNode) {
					if (mapTitle.nextSibling) {
						mapTitle.parentNode.insertBefore(pageDescription, mapTitle.nextSibling);
						mapTitle.parentNode.insertBefore(statusBox, pageDescription.nextSibling);
					} else {
						mapTitle.parentNode.appendChild(pageDescription);
						mapTitle.parentNode.appendChild(statusBox);
					}
				} else {
					root.insertBefore(pageDescription, root.firstChild);
					root.appendChild(statusBox);
				}

				var actionsPane = document.getElementById(actionsPlaceholderId);
				if (actionsPane) {
					actionsPane.appendChild(E('div', {
						'style': 'display:flex; gap:10px; flex-wrap:wrap;'
					}, [
						renderActionButton(_('Connect'), '/usr/sbin/nordvpnctl', [ 'c' ]),
						renderActionButton(_('Disconnect'), '/usr/sbin/nordvpnctl', [ 'd' ])
					]));
				}

				var logPane = document.getElementById(logsPlaceholderId);
				if (logPane)
					logPane.appendChild(logNode);

				var debugPane = document.getElementById(debugPlaceholderId);
				if (debugPane) {
					debugPane.appendChild(E('div', {
						'style': 'display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px;'
					}, [
						renderActionButton(_('Generate config'), '/usr/sbin/nordvpnctl', [ '--gen-config' ]),
						renderActionButton(_('Refresh now'), '/usr/libexec/nordvpn-refresh', [])
					]));
					debugPane.appendChild(debugOutputNode);
				}
			}, 0);

			poll.add(function() {
				return Promise.all([
					updateStatusBox(),
					updateLogs()
				]);
			}, 5);

			updateStatusBox();
			updateLogs();

			return root;
		});
	}
});