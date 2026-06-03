package com.rimvio.app;

import android.content.Intent;
import android.provider.Settings;
import android.text.TextUtils;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "RimvioNativeBridge")
public class RimvioNativeBridgePlugin extends Plugin implements NotificationForwarder.Listener {

  @Override
  public void load() {
    NotificationForwarder.setListener(this);
  }

  @Override
  protected void handleOnDestroy() {
    NotificationForwarder.setListener(null);
    super.handleOnDestroy();
  }

  @Override
  public void onNotificationPosted(JSObject payload) {
    notifyListeners("notificationPosted", payload);
  }

  @PluginMethod
  public void isNotificationAccessEnabled(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("enabled", isNotificationListenerEnabled());
    call.resolve(ret);
  }

  @PluginMethod
  public void openNotificationAccessSettings(PluginCall call) {
    Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getContext().startActivity(intent);
    call.resolve();
  }

  @PluginMethod
  public void getPlatformInfo(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("platform", "android");
    ret.put("isNative", true);
    call.resolve(ret);
  }

  private boolean isNotificationListenerEnabled() {
    String pkgName = getContext().getPackageName();
    String flat =
        Settings.Secure.getString(
            getContext().getContentResolver(), "enabled_notification_listeners");
    if (TextUtils.isEmpty(flat)) {
      return false;
    }
    String[] names = flat.split(":");
    for (String name : names) {
      if (name != null && name.contains(pkgName)) {
        return true;
      }
    }
    return false;
  }
}
