include $(TOPDIR)/rules.mk

PKG_NAME:=wg-nord
PKG_VERSION:=1.0.1-openwrt
PKG_RELEASE:=1

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/orgixmh/openwrt-wg-nord.git
PKG_SOURCE_VERSION:=v$(PKG_VERSION)
PKG_MIRROR_HASH:=skip

PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=LICENSE
PKG_MAINTAINER:=ORG9

PKG_BUILD_DEPENDS:=rust/host
PKG_BUILD_PARALLEL:=1

include $(INCLUDE_DIR)/package.mk
include $(TOPDIR)/feeds/packages/lang/rust/rust-package.mk

define Package/wg-nord
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=Generate WireGuard configs for NordVPN
  URL:=https://github.com/orgixmh/openwrt-wg-nord
  DEPENDS:=$(RUST_ARCH_DEPENDS) +ca-bundle
endef

define Package/wg-nord/description
  Rust CLI tool that generates NordVPN WireGuard configuration files.
endef

$(eval $(call RustBinPackage,wg-nord))
$(eval $(call BuildPackage,wg-nord))
