package com.moccoon.skincare.ui.activities;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton;
import com.moccoon.skincare.R;
import com.moccoon.skincare.ui.fragments.*;

public class MainActivity extends AppCompatActivity {
    private BottomNavigationView bottomNav;
    private ExtendedFloatingActionButton fabQuickChat;

    private final Fragment homeFragment = new HomeFragment();
    private final Fragment shopFragment = new ShopFragment();
    private final Fragment chatFragment = new ChatFragment();
    private final Fragment cartFragment = new CartFragment();
    private final Fragment profileFragment = new ProfileFragment();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        bottomNav = findViewById(R.id.bottomNavigation);
        fabQuickChat = findViewById(R.id.fabQuickChat);

        // Khởi tạo tab ban đầu là Trang chủ
        if (savedInstanceState == null) {
            getSupportFragmentManager().beginTransaction()
                    .replace(R.id.fragmentContainer, homeFragment)
                    .commit();
        }

        bottomNav.setOnItemSelectedListener(item -> {
            Fragment selectedFragment = null;
            int itemId = item.getItemId();

            if (itemId == R.id.nav_home) {
                selectedFragment = homeFragment;
                fabQuickChat.show();
            } else if (itemId == R.id.nav_shop) {
                selectedFragment = shopFragment;
                fabQuickChat.show();
            } else if (itemId == R.id.nav_chat) {
                selectedFragment = chatFragment;
                fabQuickChat.hide();
            } else if (itemId == R.id.nav_cart) {
                selectedFragment = cartFragment;
                fabQuickChat.hide();
            } else if (itemId == R.id.nav_profile) {
                selectedFragment = profileFragment;
                fabQuickChat.show();
            }

            if (selectedFragment != null) {
                getSupportFragmentManager().beginTransaction()
                        .replace(R.id.fragmentContainer, selectedFragment)
                        .commit();
                return true;
            }
            return false;
        });

        fabQuickChat.setOnClickListener(v -> selectTab(R.id.nav_chat));
    }

    public void selectTab(int itemId) {
        bottomNav.setSelectedItemId(itemId);
    }
}
