package com.rimvio.app;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.ContentObserver;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.provider.Settings;
import android.text.TextUtils;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "RimvioNativeBridge")
public class RimvioNativeBridgePlugin extends Plugin implements NotificationForwarder.Listener {

  private static final int PHOTO_PERMISSION_REQUEST = 9101;
  private PluginCall savedPhotoPermissionCall;
  private ContentObserver photoObserver;

  @Override
  public void load() {
    NotificationForwarder.setListener(this);
    photoObserver =
        new ContentObserver(new Handler(Looper.getMainLooper())) {
          @Override
          public void onChange(boolean selfChange) {
            JSObject payload = new JSObject();
            payload.put("timestamp", System.currentTimeMillis());
            notifyListeners("photoLibraryChanged", payload);
          }
        };
    getContext()
        .getContentResolver()
        .registerContentObserver(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI, true, photoObserver);
    getContext()
        .getContentResolver()
        .registerContentObserver(
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI, true, photoObserver);
  }

  @Override
  protected void handleOnDestroy() {
    if (photoObserver != null) {
      getContext().getContentResolver().unregisterContentObserver(photoObserver);
      photoObserver = null;
    }
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

  @PluginMethod
  public void getNetworkType(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("type", PhotoLibraryScanner.getNetworkType(getContext()));
    call.resolve(ret);
  }

  @PluginMethod
  public void requestPhotoLibraryPermission(PluginCall call) {
    String[] permissions = PhotoLibraryScanner.requiredPermissions();
    if (hasAllPermissions(permissions)) {
      JSObject ret = new JSObject();
      ret.put("granted", true);
      call.resolve(ret);
      return;
    }
    savedPhotoPermissionCall = call;
    requestAllPermissions(call, permissions, PHOTO_PERMISSION_REQUEST);
  }

  @PluginMethod
  public void scanPhotoLibrary(PluginCall call) {
    long sinceMs = call.getLong("sinceMs", 0L);
    int limit = call.getInt("limit", 40);
    int windowDays = call.getInt("windowDays", 7);
    call.resolve(PhotoLibraryScanner.scan(getContext(), sinceMs, limit, windowDays));
  }

  @PluginMethod
  public void importPhotoToCache(PluginCall call) {
    String contentUri = call.getString("contentUri");
    if (TextUtils.isEmpty(contentUri)) {
      call.reject("missing_content_uri");
      return;
    }
    String fileName = call.getString("fileName", "album-import.jpg");
    try {
      call.resolve(PhotoLibraryScanner.importToCache(getContext(), contentUri, fileName));
    } catch (Exception error) {
      call.reject("import_failed", error);
    }
  }

  @Override
  protected void handleRequestPermissionsResult(
      int requestCode, String[] permissions, int[] grantResults) {
    super.handleRequestPermissionsResult(requestCode, permissions, grantResults);
    if (requestCode != PHOTO_PERMISSION_REQUEST || savedPhotoPermissionCall == null) {
      return;
    }

    boolean granted = true;
    if (grantResults.length == 0) {
      granted = false;
    } else {
      for (int result : grantResults) {
        if (result != PackageManager.PERMISSION_GRANTED) {
          granted = false;
          break;
        }
      }
    }

    JSObject ret = new JSObject();
    ret.put("granted", granted);
    savedPhotoPermissionCall.resolve(ret);
    savedPhotoPermissionCall = null;
  }

  private boolean hasAllPermissions(String[] permissions) {
    for (String permission : permissions) {
      if (!hasPermission(permission)) {
        return false;
      }
    }
    return true;
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
