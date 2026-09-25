package com.moccoon.skincare.ui.activities;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.tabs.TabLayout;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;
import com.moccoon.skincare.R;
import com.moccoon.skincare.data.api.ApiClient;
import com.moccoon.skincare.data.api.ApiService;
import com.moccoon.skincare.data.models.ApiResponse;
import com.moccoon.skincare.data.models.AuthData;
import com.moccoon.skincare.data.models.User;
import com.moccoon.skincare.utils.SessionManager;
import java.util.HashMap;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AuthActivity extends AppCompatActivity {
    private TabLayout tabLayout;
    private TextInputLayout tilFullName, tilAddress;
    private TextInputEditText etFullName, etAccount, etPassword, etAddress;
    private MaterialButton btnSubmit;
    private ProgressBar progressBar;
    private TextView tvTitle, tvSubtitle;

    private boolean isLoginMode = true;
    private ApiService apiService;
    private SessionManager sessionManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_auth);

        apiService = ApiClient.getApiService(this);
        sessionManager = new SessionManager(this);

        initViews();
        setupListeners();
    }

    private void initViews() {
        tabLayout = findViewById(R.id.tabLayoutAuth);
        tilFullName = findViewById(R.id.tilFullName);
        tilAddress = findViewById(R.id.tilAddress);
        etFullName = findViewById(R.id.etFullName);
        etAccount = findViewById(R.id.etAccount);
        etPassword = findViewById(R.id.etPassword);
        etAddress = findViewById(R.id.etAddress);
        btnSubmit = findViewById(R.id.btnSubmitAuth);
        progressBar = findViewById(R.id.progressBarAuth);
        tvTitle = findViewById(R.id.tvAuthTitle);
        tvSubtitle = findViewById(R.id.tvAuthSubtitle);

        // Nút điền nhanh tài khoản test
        findViewById(R.id.tvQuickAdmin).setOnClickListener(v -> {
            etAccount.setText("admin@moccoon.vn");
            etPassword.setText("Admin@123456");
        });

        findViewById(R.id.tvQuickUser).setOnClickListener(v -> {
            etAccount.setText("khachhang@gmail.com");
            etPassword.setText("Admin@123456");
        });
    }

    private void setupListeners() {
        tabLayout.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(TabLayout.Tab tab) {
                isLoginMode = tab.getPosition() == 0;
                updateModeUI();
            }

            @Override
            public void onTabUnselected(TabLayout.Tab tab) {}

            @Override
            public void onTabReselected(TabLayout.Tab tab) {}
        });

        btnSubmit.setOnClickListener(v -> {
            if (isLoginMode) {
                performLogin();
            } else {
                performRegister();
            }
        });
    }

    private void updateModeUI() {
        if (isLoginMode) {
            tvTitle.setText("Chào mừng bạn trở lại");
            tvSubtitle.setText("Đăng nhập để nhận tư vấn da và mua sắm ưu đãi");
            tilFullName.setVisibility(View.GONE);
            tilAddress.setVisibility(View.GONE);
            btnSubmit.setText("Đăng Nhập");
        } else {
            tvTitle.setText("Tạo tài khoản Moccoon");
            tvSubtitle.setText("Khám phá chu trình chăm sóc da khoa học");
            tilFullName.setVisibility(View.VISIBLE);
            tilAddress.setVisibility(View.VISIBLE);
            btnSubmit.setText("Đăng Ký Tài Khoản");
        }
    }

    private void performLogin() {
        String account = etAccount.getText() != null ? etAccount.getText().toString().trim() : "";
        String password = etPassword.getText() != null ? etPassword.getText().toString().trim() : "";

        if (account.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Vui lòng nhập tài khoản và mật khẩu.", Toast.LENGTH_SHORT).show();
            return;
        }

        setLoading(true);
        Map<String, Object> body = new HashMap<>();
        body.put("account", account);
        body.put("password", password);

        apiService.login(body).enqueue(new Callback<ApiResponse<AuthData>>() {
            @Override
            public void onResponse(Call<ApiResponse<AuthData>> call, Response<ApiResponse<AuthData>> response) {
                setLoading(false);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    AuthData data = response.body().getData();
                    User u = data.getUser();
                    sessionManager.saveAuth(
                            data.getToken(), u.getId(), u.getFullName(),
                            u.getEmail() != null ? u.getEmail() : "",
                            u.getPhone() != null ? u.getPhone() : "",
                            u.getRole(),
                            u.getAddress() != null ? u.getAddress() : "",
                            u.getAvatarUrl() != null ? u.getAvatarUrl() : ""
                    );
                    Toast.makeText(AuthActivity.this, "Đăng nhập thành công!", Toast.LENGTH_SHORT).show();
                    if ("ADMIN".equalsIgnoreCase(u.getRole())) {
                        startActivity(new Intent(AuthActivity.this, AdminDashboardActivity.class));
                    } else {
                        startActivity(new Intent(AuthActivity.this, MainActivity.class));
                    }
                    finish();
                } else {
                    String msg = response.body() != null ? response.body().getMessage() : "Đăng nhập thất bại";
                    Toast.makeText(AuthActivity.this, msg, Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<AuthData>> call, Throwable t) {
                setLoading(false);
                Toast.makeText(AuthActivity.this, "Lỗi kết nối máy chủ: " + t.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }

    private void performRegister() {
        String fullName = etFullName.getText() != null ? etFullName.getText().toString().trim() : "";
        String account = etAccount.getText() != null ? etAccount.getText().toString().trim() : "";
        String password = etPassword.getText() != null ? etPassword.getText().toString().trim() : "";
        String address = etAddress.getText() != null ? etAddress.getText().toString().trim() : "";

        if (fullName.isEmpty() || account.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Vui lòng điền họ tên, tài khoản và mật khẩu.", Toast.LENGTH_SHORT).show();
            return;
        }

        setLoading(true);
        Map<String, Object> body = new HashMap<>();
        body.put("full_name", fullName);
        if (account.contains("@")) {
            body.put("email", account);
        } else {
            body.put("phone", account);
        }
        body.put("password", password);
        body.put("address", address);

        apiService.register(body).enqueue(new Callback<ApiResponse<AuthData>>() {
            @Override
            public void onResponse(Call<ApiResponse<AuthData>> call, Response<ApiResponse<AuthData>> response) {
                setLoading(false);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    AuthData data = response.body().getData();
                    User u = data.getUser();
                    sessionManager.saveAuth(
                            data.getToken(), u.getId(), u.getFullName(),
                            u.getEmail() != null ? u.getEmail() : "",
                            u.getPhone() != null ? u.getPhone() : "",
                            u.getRole(),
                            u.getAddress() != null ? u.getAddress() : "",
                            u.getAvatarUrl() != null ? u.getAvatarUrl() : ""
                    );
                    Toast.makeText(AuthActivity.this, "Đăng ký tài khoản thành công!", Toast.LENGTH_SHORT).show();
                    startActivity(new Intent(AuthActivity.this, MainActivity.class));
                    finish();
                } else {
                    String msg = response.body() != null ? response.body().getMessage() : "Đăng ký thất bại";
                    Toast.makeText(AuthActivity.this, msg, Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<AuthData>> call, Throwable t) {
                setLoading(false);
                Toast.makeText(AuthActivity.this, "Lỗi kết nối máy chủ: " + t.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }

    private void setLoading(boolean loading) {
        progressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
        btnSubmit.setEnabled(!loading);
    }
}
