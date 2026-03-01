include $(TOPDIR)/rules.mk

PKG_NAME:=nordvpn-wireguard
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

PKG_LICENSE:=MIT
PKG_MAINTAINER:=Konstantinos Nikas

include $(INCLUDE_DIR)/package.mk

define Package/nordvpn-wireguard
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=VPN
  TITLE:=NordVPN WireGuard helper
  DEPENDS:=+wg-nord +wireguard-tools +kmod-wireguard +ca-bundle
endef

define Package/nordvpn-wireguard/description
 Helper scripts, UCI config, init integration and cron refresh for NordVPN WireGuard on OpenWrt.
endef

define Package/nordvpn-wireguard/conffiles
/etc/config/nordvpn
endef

define Build/Compile
endef

define Package/nordvpn-wireguard/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/nordvpn $(1)/etc/config/nordvpn

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/nordvpn $(1)/etc/init.d/nordvpn

	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./files/usr/sbin/nordvpnctl $(1)/usr/sbin/nordvpnctl

	$(INSTALL_DIR) $(1)/usr/libexec
	$(INSTALL_BIN) ./files/usr/libexec/nordvpn-refresh $(1)/usr/libexec/nordvpn-refresh

	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/etc/uci-defaults/99-nordvpn-cron $(1)/etc/uci-defaults/99-nordvpn-cron

	$(INSTALL_DIR) $(1)/etc/nordvpn/config
endef

$(eval $(call BuildPackage,nordvpn-wireguard))
