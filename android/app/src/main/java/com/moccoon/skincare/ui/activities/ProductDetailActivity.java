package com.moccoon.skincare.ui.activities;

import android.content.Intent;
import android.graphics.Paint;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.bumptech.glide.Glide;
import com.google.android.material.button.MaterialButton;
import com.moccoon.skincare.R;
import com.moccoon.skincare.data.api.ApiClient;
import com.moccoon.skincare.data.api.ApiService;
import com.moccoon.skincare.data.models.ApiResponse;
import com.moccoon.skincare.data.models.Product;
import com.moccoon.skincare.utils.CurrencyUtils;
import java.util.HashMap;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ProductDetailActivity extends AppCompatActivity {
    private ImageView ivImage;
    private TextView tvName, tvPrice, tvOriginalPrice, tvVolume, tvSkinType, tvStock;
    private TextView tvShortDesc, tvBenefits, tvIngredients, tvUsage;
    private MaterialButton btnAddToCart, btnBuyNow;
    private ImageButton btnBack, btnCart, btnConsultChat;

    private ApiService apiService;
    private Product currentProduct;
    private String productId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_product_detail);

        apiService = ApiClient.getApiService(this);

        initViews();

        currentProduct = (Product) getIntent().getSerializableExtra("product_obj");
        productId = getIntent().getStringExtra("product_id");

        if (currentProduct != null) {
            displayProduct(currentProduct);
        }

        if (productId != null) {
            loadProductDetail(productId);
        }

        setupActions();
    }

    private void initViews() {
        ivImage = findViewById(R.id.ivDetailProductImage);
        tvName = findViewById(R.id.tvDetailName);
        tvPrice = findViewById(R.id.tvDetailPrice);
        tvOriginalPrice = findViewById(R.id.tvDetailOriginalPrice);
        tvVolume = findViewById(R.id.tvDetailVolume);
        tvSkinType = findViewById(R.id.tvDetailSkinType);
        tvStock = findViewById(R.id.tvDetailStock);
        tvShortDesc = findViewById(R.id.tvDetailShortDesc);
        tvBenefits = findViewById(R.id.tvDetailBenefits);
        tvIngredients = findViewById(R.id.tvDetailIngredients);
        tvUsage = findViewById(R.id.tvDetailUsage);

        btnAddToCart = findViewById(R.id.btnDetailAddToCart);
        btnBuyNow = findViewById(R.id.btnDetailBuyNow);
        btnBack = findViewById(R.id.btnBackDetail);
        btnCart = findViewById(R.id.btnCartDetail);
        btnConsultChat = findViewById(R.id.btnDetailConsultChat);
    }

    private void displayProduct(Product p) {
        currentProduct = p;
        tvName.setText(p.getName());
        tvPrice.setText(CurrencyUtils.formatVND(p.getPrice()));

        if (p.getOriginalPrice() != null && p.getOriginalPrice() > p.getPrice()) {
            tvOriginalPrice.setText(CurrencyUtils.formatVND(p.getOriginalPrice()));
            tvOriginalPrice.setPaintFlags(tvOriginalPrice.getPaintFlags() | Paint.STRIKE_THRU_TEXT_FLAG);
            tvOriginalPrice.setVisibility(View.VISIBLE);
        } else {
            tvOriginalPrice.setVisibility(View.GONE);
        }

        tvVolume.setText(p.getVolume() != null ? p.getVolume() : "Tiêu chuẩn");
        tvSkinType.setText(p.getSkinType() != null ? p.getSkinType() : "Mọi loại da");
        tvStock.setText("Còn " + p.getStockQuantity() + " sản phẩm");

        tvShortDesc.setText(p.getShortDescription() != null ? p.getShortDescription() : "");
        tvBenefits.setText(p.getBenefits() != null ? p.getBenefits() : "Làm sạch sâu và nuôi dưỡng da chuyên sâu.");
        tvIngredients.setText(p.getIngredients() != null ? p.getIngredients() : "Chiết xuất thiên nhiên lành tính, an toàn chuẩn y khoa.");
        tvUsage.setText(p.getUsageInstructions() != null ? p.getUsageInstructions() : "Sử dụng hàng ngày trong chu trình skincare.");

        Glide.with(this)
                .load(p.getPrimaryImage())
                .placeholder(R.drawable.bg_search_bar)
                .into(ivImage);
    }

    private void loadProductDetail(String id) {
        apiService.getProductDetail(id).enqueue(new Callback<ApiResponse<Product>>() {
            @Override
            public void onResponse(Call<ApiResponse<Product>> call, Response<ApiResponse<Product>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    displayProduct(response.body().getData());
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Product>> call, Throwable t) {}
        });
    }

    private void setupActions() {
        btnBack.setOnClickListener(v -> finish());

        btnCart.setOnClickListener(v -> {
            finish();
        });

        btnConsultChat.setOnClickListener(v -> {
            finish();
        });

        btnAddToCart.setOnClickListener(v -> {
            if (currentProduct == null) return;
            addToCart(false);
        });

        btnBuyNow.setOnClickListener(v -> {
            if (currentProduct == null) return;
            addToCart(true);
        });
    }

    private void addToCart(boolean proceedCheckout) {
        Map<String, Object> body = new HashMap<>();
        body.put("product_id", currentProduct.getId());
        body.put("quantity", 1);

        apiService.addToCart(body).enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    if (proceedCheckout) {
                        Intent intent = new Intent(ProductDetailActivity.this, CheckoutActivity.class);
                        startActivity(intent);
                        finish();
                    } else {
                        Toast.makeText(ProductDetailActivity.this, "Đã thêm vào giỏ hàng!", Toast.LENGTH_SHORT).show();
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                Toast.makeText(ProductDetailActivity.this, "Lỗi: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }
}
