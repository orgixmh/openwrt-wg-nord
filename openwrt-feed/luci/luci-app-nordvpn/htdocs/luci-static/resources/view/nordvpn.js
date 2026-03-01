'use strict';
'require view';
'require form';
'require fs';
'require ui';
'require uci';
'require poll';

function renderButton(title, action, outputNode) {
	return E('button', {
		'class': 'btn cbi-button cbi-button-action',
		'click': ui.createHandlerFn(this, function(ev) {
			ui.addNotification(null, E('p', _('Running: %s').format(title)), 'info');

			return fs.exec('/usr/sbin/nordvpnctl', [ action ]).then(function(res) {
				var out = '';
				if (res.stdout)
					out += res.stdout;
				if (res.stderr)
					out += (out ? '\n' : '') + res.stderr;

				outputNode.textContent = out || _('Command finished with no output.');
				ui.addNotification(null, E('p', _('Command completed.')), 'info');
			}).catch(function(err) {
				outputNode.textContent = _('Command failed: %s').format(err.message || err);
				ui.addNotification(null, E('p', _('Command failed.')), 'danger');
			});
		})
	}, [ title ]);
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('nordvpn')
		]);
	},

	render: function() {
		var m, s, o;
		var outputNode = E('pre', {
			'style': 'padding:1em; background:#111; color:#ddd; overflow:auto; min-height:160px; border-radius:6px;'
		}, _('No command output yet.'));

		var statusNode = E('pre', {
			'style': 'padding:1em; background:#111; color:#ddd; overflow:auto; min-height:80px; border-radius:6px;'
		}, _('Loading status...'));

		m = new form.Map('nordvpn', _('NordVPN WireGuard'));

		s = m.section(form.TypedSection, 'main', _('Settings'));
		s.anonymous = true;

		o = s.option(form.Flag, 'enabled', _('Enabled'));
		o.rmempty = false;

		o = s.option(form.Value, 'token_file', _('Token file'));
		o.placeholder = '/etc/nordvpn/config/token';

		o = s.option(form.Value, 'conf_file', _('Config file'));
		o.placeholder = '/etc/nordvpn/config/nord.conf';

		o = s.option(form.Value, 'server', _('Server'));
		o.placeholder = 'si14.nordvpn.com';

		o = s.option(form.Flag, 'auto_refresh', _('Auto refresh'));
		o.rmempty = false;

		o = s.option(form.Value, 'refresh_days', _('Refresh every X days'));
		o.datatype = 'uinteger';
		o.placeholder = '3';

		o = s.option(form.Flag, 'auto_connect', _('Auto connect'));
		o.rmempty = false;

		o = s.option(form.Value, 'interface_name', _('Interface name'));
		o.placeholder = 'nordvpn';

		o = s.option(form.Value, 'status_file', _('Status file'));
		o.placeholder = '/var/run/nordvpn.status';

		var statusBox = E('div', { 'class': 'cbi-section' }, [
			E('h3', _('Status')),
			statusNode
		]);

		var actionsBox = E('div', { 'class': 'cbi-section' }, [
			E('h3', _('Actions')),
			E('div', { 'style': 'display:flex; gap:10px; flex-wrap:wrap; margin-bottom:1em;' }, [
				renderButton(_('Generate config'), '--gen-config', outputNode),
				renderButton(_('Connect'), 'c', outputNode),
				renderButton(_('Disconnect'), 'd', outputNode),
				E('button', {
					'class': 'btn cbi-button cbi-button-action',
					'click': ui.createHandlerFn(this, function() {
						ui.addNotification(null, E('p', _('Running refresh helper...')), 'info');

						return fs.exec('/usr/libexec/nordvpn-refresh', []).then(function(res) {
							var out = '';
							if (res.stdout)
								out += res.stdout;
							if (res.stderr)
								out += (out ? '\n' : '') + res.stderr;

							outputNode.textContent = out || _('Refresh finished with no output.');
							ui.addNotification(null, E('p', _('Refresh completed.')), 'info');
						}).catch(function(err) {
							outputNode.textContent = _('Refresh failed: %s').format(err.message || err);
							ui.addNotification(null, E('p', _('Refresh failed.')), 'danger');
						});
					})
				}, [ _('Refresh now') ])
			]),
			E('h4', _('Command output')),
			outputNode
		]);

		poll.add(function() {
			return fs.read('/var/run/nordvpn.status').then(function(res) {
				statusNode.textContent = res.trim() || _('No status available.');
			}).catch(function() {
				statusNode.textContent = _('No status file available yet.');
			});
		}, 5);

		return m.render().then(function(mapEl) {
			return E([], [
				mapEl,
				statusBox,
				actionsBox
			]);
		});
	}
});
