package com.moccoon.skincare.ui.activities;

import android.content.Intent;
import android.os.Bundle;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.moccoon.skincare.R;
import com.moccoon.skincare.data.api.ApiClient;
import com.moccoon.skincare.data.api.ApiService;
import com.moccoon.skincare.data.models.AdminOrdersData;
import com.moccoon.skincare.data.models.ApiResponse;
import com.moccoon.skincare.data.models.Category;
import com.moccoon.skincare.data.models.DashboardData;
import com.moccoon.skincare.data.models.Order;
import com.moccoon.skincare.data.models.Product;
import com.moccoon.skincare.data.models.ProductListData;
import com.moccoon.skincare.ui.adapters.CategoryAdapter;
import com.moccoon.skincare.ui.adapters.OrderAdapter;
import com.moccoon.skincare.ui.adapters.ProductAdapter;
import com.moccoon.skincare.utils.CurrencyUtils;
import java.util.ArrayList;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AdminDashboardActivity extends AppCompatActivity {
    private TextView tvRevenueToday, tvRevenueMonth, tvPendingOrders, tvTotalCustomers;
    private TextView tvCategoryCount, tvProductCount, tvOrderCount;
    private RecyclerView rvCategories, rvProducts, rvOrders;
    private CategoryAdapter categoryAdapter;
    private ProductAdapter productAdapter;
    private OrderAdapter orderAdapter;
    private ImageButton btnBack;
    private ApiService apiService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_dashboard);

        apiService = ApiClient.getApiService(this);

        initViews();
        setupAdapters();
        loadAllData();
    }

    private void initViews() {
        btnBack = findViewById(R.id.btnBackAdmin);
        tvRevenueToday = findViewById(R.id.tvAdminRevenueToday);
        tvRevenueMonth = findViewById(R.id.tvAdminRevenueMonth);
        tvPendingOrders = findViewById(R.id.tvAdminPendingOrders);
        tvTotalCustomers = findViewById(R.id.tvAdminTotalCustomers);

        tvCategoryCount = findViewById(R.id.tvAdminCategoryCount);
        tvProductCount = findViewById(R.id.tvAdminProductCount);
        tvOrderCount = findViewById(R.id.tvAdminOrderCount);

        rvCategories = findViewById(R.id.rvAdminCategories);
        rvProducts = findViewById(R.id.rvAdminProducts);
        rvOrders = findViewById(R.id.rvAdminOrders);

        btnBack.setOnClickListener(v -> finish());
    }

    private void setupAdapters() {
        // 1. Categories Adapter
        categoryAdapter = new CategoryAdapter((category, position) -> {
            categoryAdapter.setSelectedPosition(position);
            loadProducts(category.getId());
        });
        rvCategories.setLayoutManager(new LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false));
        rvCategories.setAdapter(categoryAdapter);

        // 2. Products Adapter
        productAdapter = new ProductAdapter(new ProductAdapter.OnProductClickListener() {
            @Override
            public void onProductClick(Product product) {
                Intent intent = new Intent(AdminDashboardActivity.this, ProductDetailActivity.class);
                intent.putExtra("product_id", String.valueOf(product.getId()));
                intent.putExtra("product_obj", product);
                startActivity(intent);
            }

            @Override
            public void onAddToCartClick(Product product) {
                Toast.makeText(AdminDashboardActivity.this, "Sản phẩm: " + product.getName() + " (Tồn kho: " + product.getStockQuantity() + ")", Toast.LENGTH_SHORT).show();
            }
        });
        rvProducts.setLayoutManager(new LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false));
        rvProducts.setAdapter(productAdapter);

        // 3. Orders Adapter
        orderAdapter = new OrderAdapter(order -> {
            Intent intent = new Intent(AdminDashboardActivity.this, OrderDetailActivity.class);
            intent.putExtra("order_id", String.valueOf(order.getId()));
            intent.putExtra("order_obj", order);
            startActivity(intent);
        });
        rvOrders.setLayoutManager(new LinearLayoutManager(this));
        rvOrders.setAdapter(orderAdapter);
    }

    private void loadAllData() {
        loadDashboardStats();
        loadCategories();
        loadProducts(null);
        loadOrders();
    }

    private void loadDashboardStats() {
        apiService.getAdminDashboard().enqueue(new Callback<ApiResponse<DashboardData>>() {
            @Override
            public void onResponse(Call<ApiResponse<DashboardData>> call, Response<ApiResponse<DashboardData>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    DashboardData data = response.body().getData();
                    if (data != null) {
                        if (data.getRevenue() != null) {
                            tvRevenueToday.setText(CurrencyUtils.formatVND(data.getRevenue().getRevenueToday()));
                            tvRevenueMonth.setText(CurrencyUtils.formatVND(data.getRevenue().getRevenueThisMonth()));
                        }
                        if (data.getOrders() != null) {
                            tvPendingOrders.setText(String.valueOf(data.getOrders().getPendingOrders()));
                        }
                        if (data.getCustomers() != null) {
                            tvTotalCustomers.setText(String.valueOf(data.getCustomers().getTotalCustomers()));
                        }
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<DashboardData>> call, Throwable t) {
                // Ignore silent background load
            }
        });
    }

    private void loadCategories() {
        apiService.getCategories().enqueue(new Callback<ApiResponse<List<Category>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<Category>>> call, Response<ApiResponse<List<Category>>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    List<Category> list = response.body().getData();
                    if (list != null) {
                        tvCategoryCount.setText(list.size() + " danh mục");
                        categoryAdapter.setCategories(list);
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<Category>>> call, Throwable t) {
                // Ignore silent error
            }
        });
    }

    private void loadProducts(Integer categoryId) {
        apiService.getProducts(categoryId, null, null).enqueue(new Callback<ApiResponse<ProductListData>>() {
            @Override
            public void onResponse(Call<ApiResponse<ProductListData>> call, Response<ApiResponse<ProductListData>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    ProductListData pData = response.body().getData();
                    if (pData != null && pData.getProducts() != null) {
                        tvProductCount.setText(pData.getProducts().size() + " sản phẩm");
                        productAdapter.setProducts(pData.getProducts());
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<ProductListData>> call, Throwable t) {
                // Ignore silent error
            }
        });
    }

    private void loadOrders() {
        apiService.getAdminOrders().enqueue(new Callback<ApiResponse<AdminOrdersData>>() {
            @Override
            public void onResponse(Call<ApiResponse<AdminOrdersData>> call, Response<ApiResponse<AdminOrdersData>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    AdminOrdersData oData = response.body().getData();
                    if (oData != null && oData.getOrders() != null) {
                        tvOrderCount.setText(oData.getOrders().size() + " đơn");
                        orderAdapter.setOrders(oData.getOrders());
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<AdminOrdersData>> call, Throwable t) {
                // Ignore silent error
            }
        });
    }
}
