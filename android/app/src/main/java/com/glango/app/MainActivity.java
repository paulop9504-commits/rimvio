package com.glango.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(GlangoNativeBridgePlugin.class);
    super.onCreate(savedInstanceState);
  }
}
