package com.moccoon.skincare.ui.activities;

import android.content.Intent;
import android.os.Bundle;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.RadioButton;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.moccoon.skincare.R;
import com.moccoon.skincare.data.api.ApiClient;
import com.moccoon.skincare.data.api.ApiService;
import com.moccoon.skincare.data.models.ApiResponse;
import com.moccoon.skincare.data.models.CartData;
import com.moccoon.skincare.data.models.Order;
import com.moccoon.skincare.utils.CurrencyUtils;
import com.moccoon.skincare.utils.SessionManager;
import java.util.HashMap;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class CheckoutActivity extends AppCompatActivity {
    private EditText etName, etPhone, etAddress, etNote;
    private RadioButton rbCOD, rbBanking;
    private TextView tvSubtotal, tvShippingFee, tvFinalAmount;
    private MaterialButton btnConfirm;
    private ImageButton btnBack;

    private ApiService apiService;
    private SessionManager sessionManager;
    private double currentSubtotal = 0;
    private double currentShippingFee = 30000;
    private double currentFinalAmount = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_checkout);

        apiService = ApiClient.getApiService(this);
        sessionManager = new SessionManager(this);

        initViews();
        loadCartSummary();
        setupListeners();
    }

    private void initViews() {
        btnBack = findViewById(R.id.btnBackCheckout);
        etName = findViewById(R.id.etCheckoutName);
        etPhone = findViewById(R.id.etCheckoutPhone);
        etAddress = findViewById(R.id.etCheckoutAddress);
        etNote = findViewById(R.id.etCheckoutNote);

        rbCOD = findViewById(R.id.rbCOD);
        rbBanking = findViewById(R.id.rbBanking);

        tvSubtotal = findViewById(R.id.tvCheckoutSubtotal);
        tvShippingFee = findViewById(R.id.tvCheckoutShippingFee);
        tvFinalAmount = findViewById(R.id.tvCheckoutFinalAmount);
        btnConfirm = findViewById(R.id.btnConfirmOrder);

        etName.setText(sessionManager.getFullName());
        etPhone.setText(sessionManager.getPhone());
        etAddress.setText(sessionManager.getAddress());
    }

    private void loadCartSummary() {
        apiService.getCart().enqueue(new Callback<ApiResponse<CartData>>() {
            @Override
            public void onResponse(Call<ApiResponse<CartData>> call, Response<ApiResponse<CartData>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    CartData data = response.body().getData();
                    currentSubtotal = data.getTotalAmount();
                    currentShippingFee = currentSubtotal >= 500000 ? 0 : 30000;
                    currentFinalAmount = currentSubtotal + currentShippingFee;

                    tvSubtotal.setText(CurrencyUtils.formatVND(currentSubtotal));
                    tvShippingFee.setText(currentShippingFee == 0 ? "Miễn phí" : CurrencyUtils.formatVND(currentShippingFee));
                    tvFinalAmount.setText(CurrencyUtils.formatVND(currentFinalAmount));
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<CartData>> call, Throwable t) {}
        });
    }

    private void setupListeners() {
        btnBack.setOnClickListener(v -> finish());

        btnConfirm.setOnClickListener(v -> {
            String name = etName.getText() != null ? etName.getText().toString().trim() : "";
            String phone = etPhone.getText() != null ? etPhone.getText().toString().trim() : "";
            String address = etAddress.getText() != null ? etAddress.getText().toString().trim() : "";
            String note = etNote.getText() != null ? etNote.getText().toString().trim() : "";

            if (name.isEmpty() || phone.isEmpty() || address.isEmpty()) {
                Toast.makeText(this, "Vui lòng nhập đầy đủ tên, số điện thoại và địa chỉ giao hàng.", Toast.LENGTH_SHORT).show();
                return;
            }

            btnConfirm.setEnabled(false);

            Map<String, Object> body = new HashMap<>();
            body.put("receiver_name", name);
            body.put("receiver_phone", phone);
            body.put("shipping_address", address);
            body.put("payment_method", rbBanking.isChecked() ? "BANKING" : "COD");
            body.put("note", note);
            body.put("from_cart", true);

            apiService.checkout(body).enqueue(new Callback<ApiResponse<Order>>() {
                @Override
                public void onResponse(Call<ApiResponse<Order>> call, Response<ApiResponse<Order>> response) {
                    btnConfirm.setEnabled(true);
                    if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                        Toast.makeText(CheckoutActivity.this, "Đặt hàng thành công!", Toast.LENGTH_LONG).show();
                        Intent intent = new Intent(CheckoutActivity.this, MainActivity.class);
                        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        startActivity(intent);
                        finish();
                    } else {
                        String msg = response.body() != null ? response.body().getMessage() : "Đặt hàng thất bại";
                        Toast.makeText(CheckoutActivity.this, msg, Toast.LENGTH_LONG).show();
                    }
                }

                @Override
                public void onFailure(Call<ApiResponse<Order>> call, Throwable t) {
                    btnConfirm.setEnabled(true);
                    Toast.makeText(CheckoutActivity.this, "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        });
    }
}
