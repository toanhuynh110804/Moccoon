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
    private TextView tvDetailSubtotal, tvDetailShippingFee, tvDetailFinalAmount, tvDetailPaymentMethod;
    private android.widget.LinearLayout layoutOrderItems;
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
        tvDetailSubtotal = findViewById(R.id.tvDetailSubtotal);
        tvDetailShippingFee = findViewById(R.id.tvDetailShippingFee);
        tvDetailFinalAmount = findViewById(R.id.tvDetailFinalAmount);
        tvDetailPaymentMethod = findViewById(R.id.tvDetailPaymentMethod);
        layoutOrderItems = findViewById(R.id.layoutOrderItemsContainer);
    }

    private void displayOrder(Order order) {
        currentOrder = order;
        orderId = order.getId();

        tvOrderCode.setText("Mã đơn: #" + order.getOrderCode());
        tvOrderDate.setText("Ngày đặt: " + (order.getCreatedAt() != null ? order.getCreatedAt().replace("T", " ") : ""));
        tvReceiverName.setText("Người nhận: " + order.getReceiverName());
        tvReceiverPhone.setText("SĐT: " + order.getReceiverPhone());
        tvAddress.setText("Địa chỉ: " + order.getShippingAddress());

        if (tvDetailSubtotal != null) {
            tvDetailSubtotal.setText(com.moccoon.skincare.utils.CurrencyUtils.formatVND(order.getTotalAmount()));
        }
        if (tvDetailShippingFee != null) {
            if (order.getShippingFee() > 0) {
                tvDetailShippingFee.setText(com.moccoon.skincare.utils.CurrencyUtils.formatVND(order.getShippingFee()));
            } else {
                tvDetailShippingFee.setText("0đ (Miễn phí)");
            }
        }
        if (tvDetailFinalAmount != null) {
            tvDetailFinalAmount.setText(com.moccoon.skincare.utils.CurrencyUtils.formatVND(order.getFinalAmount()));
        }
        if (tvDetailPaymentMethod != null) {
            String method = "BANKING".equalsIgnoreCase(order.getPaymentMethod()) ? "Chuyển khoản QR" : "Thanh toán COD";
            String pStatus = "PAID".equalsIgnoreCase(order.getPaymentStatus()) ? "Đã thanh toán" : "Chưa thanh toán";
            tvDetailPaymentMethod.setText("Hình thức: " + method + " • " + pStatus);
        }

        // Render danh sách sản phẩm
        if (layoutOrderItems != null) {
            layoutOrderItems.removeAllViews();
            if (order.getItems() != null && !order.getItems().isEmpty()) {
                for (Order.OrderItem it : order.getItems()) {
                    android.widget.LinearLayout row = new android.widget.LinearLayout(this);
                    row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
                    row.setGravity(android.view.Gravity.CENTER_VERTICAL);
                    row.setPadding(0, 16, 0, 16);

                    android.widget.ImageView iv = new android.widget.ImageView(this);
                    android.widget.LinearLayout.LayoutParams imgParams = new android.widget.LinearLayout.LayoutParams(130, 130);
                    imgParams.setMarginEnd(24);
                    iv.setLayoutParams(imgParams);
                    iv.setScaleType(android.widget.ImageView.ScaleType.CENTER_CROP);
                    com.bumptech.glide.Glide.with(this)
                        .load(it.getProductImage())
                        .placeholder(R.drawable.bg_search_bar)
                        .into(iv);
                    row.addView(iv);

                    android.widget.LinearLayout infoLayout = new android.widget.LinearLayout(this);
                    infoLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
                    android.widget.LinearLayout.LayoutParams infoParams = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
                    infoLayout.setLayoutParams(infoParams);

                    android.widget.TextView tvTitle = new android.widget.TextView(this);
                    tvTitle.setText(it.getProductName());
                    tvTitle.setTextColor(getResources().getColor(R.color.text_primary, getTheme()));
                    tvTitle.setTextSize(13);
                    tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
                    infoLayout.addView(tvTitle);

                    android.widget.TextView tvQty = new android.widget.TextView(this);
                    tvQty.setText("Số lượng: x" + it.getQuantity() + " • " + com.moccoon.skincare.utils.CurrencyUtils.formatVND(it.getPrice()));
                    tvQty.setTextColor(getResources().getColor(R.color.text_hint, getTheme()));
                    tvQty.setTextSize(11);
                    infoLayout.addView(tvQty);

                    row.addView(infoLayout);

                    android.widget.TextView tvTotal = new android.widget.TextView(this);
                    tvTotal.setText(com.moccoon.skincare.utils.CurrencyUtils.formatVND(it.getTotalPrice() > 0 ? it.getTotalPrice() : (it.getPrice() * it.getQuantity())));
                    tvTotal.setTextColor(getResources().getColor(R.color.price, getTheme()));
                    tvTotal.setTextSize(13);
                    tvTotal.setTypeface(null, android.graphics.Typeface.BOLD);
                    row.addView(tvTotal);

                    layoutOrderItems.addView(row);

                    android.view.View divider = new android.view.View(this);
                    divider.setLayoutParams(new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 1));
                    divider.setBackgroundColor(getResources().getColor(R.color.divider, getTheme()));
                    layoutOrderItems.addView(divider);
                }
            } else {
                android.widget.TextView tvNoItems = new android.widget.TextView(this);
                tvNoItems.setText("Không có sản phẩm");
                tvNoItems.setTextColor(getResources().getColor(R.color.text_hint, getTheme()));
                tvNoItems.setTextSize(12);
                layoutOrderItems.addView(tvNoItems);
            }
        }

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
