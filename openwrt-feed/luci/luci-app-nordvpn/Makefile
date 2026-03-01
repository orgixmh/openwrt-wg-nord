include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-nordvpn
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

LUCI_TITLE:=LuCI support for NordVPN WireGuard helper
LUCI_DEPENDS:=+luci-base +rpcd +rpcd-mod-file +nordvpn-wireguard
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt LuCI package pattern
$(eval $(call BuildPackage,$(PKG_NAME)))
