package com.moccoon.skincare.ui.activities;

import android.os.Bundle;
import android.view.View;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.moccoon.skincare.R;
import com.moccoon.skincare.data.api.ApiClient;
import com.moccoon.skincare.data.api.ApiService;
import com.moccoon.skincare.data.models.ApiResponse;
import com.moccoon.skincare.data.models.Order;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class OrderDetailActivity extends AppCompatActivity {
    private TextView tvOrderCode, tvOrderStatus, tvOrderDate;
    private TextView tvReceiverName, tvReceiverPhone, tvAddress;
    private MaterialButton btnCancelOrder;
    private ImageButton btnBack;

    private ApiService apiService;
    private Order currentOrder;
    private int orderId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_order_detail);

        apiService = ApiClient.getApiService(this);

        initViews();

        currentOrder = (Order) getIntent().getSerializableExtra("order_obj");
        String idStr = getIntent().getStringExtra("order_id");
        if (idStr != null) {
            orderId = Integer.parseInt(idStr);
        }

        if (currentOrder != null) {
            displayOrder(currentOrder);
        } else if (orderId > 0) {
            loadOrderDetail(String.valueOf(orderId));
        }

        btnBack.setOnClickListener(v -> finish());
        btnCancelOrder.setOnClickListener(v -> cancelOrder());
    }

    private void initViews() {
        btnBack = findViewById(R.id.btnBackOrderDetail);
        tvOrderCode = findViewById(R.id.tvDetailOrderCode);
        tvOrderStatus = findViewById(R.id.tvDetailOrderStatus);
        tvOrderDate = findViewById(R.id.tvDetailOrderDate);
        tvReceiverName = findViewById(R.id.tvDetailReceiverName);
        tvReceiverPhone = findViewById(R.id.tvDetailReceiverPhone);
        tvAddress = findViewById(R.id.tvDetailAddress);
        btnCancelOrder = findViewById(R.id.btnCancelThisOrder);
    }

    private void displayOrder(Order order) {
        currentOrder = order;
        orderId = order.getId();

        tvOrderCode.setText("Mã đơn: #" + order.getOrderCode());
        tvOrderDate.setText("Ngày đặt: " + (order.getCreatedAt() != null ? order.getCreatedAt().replace("T", " ") : ""));
        tvReceiverName.setText("Người nhận: " + order.getReceiverName());
        tvReceiverPhone.setText("SĐT: " + order.getReceiverPhone());
        tvAddress.setText("Địa chỉ: " + order.getShippingAddress());

        String status = order.getOrderStatus();
        tvOrderStatus.setText(status);

        if ("PENDING".equalsIgnoreCase(status)) {
            tvOrderStatus.setText("ĐANG XỬ LÝ");
            tvOrderStatus.setBackgroundResource(R.drawable.bg_badge_orange);
            btnCancelOrder.setVisibility(View.VISIBLE);
        } else if ("PREPARING".equalsIgnoreCase(status)) {
            tvOrderStatus.setText("ĐANG CHUẨN BỊ");
            tvOrderStatus.setBackgroundResource(R.drawable.bg_floating_chat);
            btnCancelOrder.setVisibility(View.GONE);
        } else if ("SHIPPING".equalsIgnoreCase(status)) {
            tvOrderStatus.setText("ĐANG GIAO HÀNG");
            tvOrderStatus.setBackgroundResource(R.drawable.bg_floating_chat);
            btnCancelOrder.setVisibility(View.GONE);
        } else if ("DELIVERED".equalsIgnoreCase(status)) {
            tvOrderStatus.setText("ĐÃ GIAO THÀNH CÔNG");
            tvOrderStatus.setBackgroundResource(R.drawable.bg_floating_chat);
            btnCancelOrder.setVisibility(View.GONE);
        } else if ("CANCELLED".equalsIgnoreCase(status)) {
            tvOrderStatus.setText("ĐÃ HỦY ĐƠN");
            tvOrderStatus.setBackgroundResource(R.drawable.bg_badge_orange);
            btnCancelOrder.setVisibility(View.GONE);
        }
    }

    private void loadOrderDetail(String id) {
        apiService.getOrderDetail(id).enqueue(new Callback<ApiResponse<Order>>() {
            @Override
            public void onResponse(Call<ApiResponse<Order>> call, Response<ApiResponse<Order>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    displayOrder(response.body().getData());
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Order>> call, Throwable t) {}
        });
    }

    private void cancelOrder() {
        if (orderId <= 0) return;
        btnCancelOrder.setEnabled(false);

        apiService.cancelOrder(orderId).enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                btnCancelOrder.setEnabled(true);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    Toast.makeText(OrderDetailActivity.this, "Đã hủy đơn hàng thành công.", Toast.LENGTH_SHORT).show();
                    tvOrderStatus.setText("ĐÃ HỦY ĐƠN");
                    btnCancelOrder.setVisibility(View.GONE);
                } else {
                    Toast.makeText(OrderDetailActivity.this, "Không thể hủy đơn hàng này.", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                btnCancelOrder.setEnabled(true);
                Toast.makeText(OrderDetailActivity.this, "Lỗi: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }
}
