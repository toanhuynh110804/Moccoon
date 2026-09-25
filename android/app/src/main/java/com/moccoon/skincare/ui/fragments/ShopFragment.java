package com.moccoon.skincare.ui.fragments;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.moccoon.skincare.R;
import com.moccoon.skincare.data.api.ApiClient;
import com.moccoon.skincare.data.api.ApiService;
import com.moccoon.skincare.data.models.ApiResponse;
import com.moccoon.skincare.data.models.Category;
import com.moccoon.skincare.data.models.Product;
import com.moccoon.skincare.data.models.ProductListData;
import com.moccoon.skincare.ui.activities.ProductDetailActivity;
import com.moccoon.skincare.ui.adapters.CategoryAdapter;
import com.moccoon.skincare.ui.adapters.ProductAdapter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ShopFragment extends Fragment implements ProductAdapter.OnProductClickListener {
    private EditText etSearch;
    private RecyclerView rvCategories, rvProducts;
    private SwipeRefreshLayout swipeRefresh;

    private CategoryAdapter categoryAdapter;
    private ProductAdapter productAdapter;
    private ApiService apiService;

    private Integer selectedCategoryId = null;
    private String currentSearchKeyword = "";

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_shop, container, false);

        apiService = ApiClient.getApiService(requireContext());

        etSearch = view.findViewById(R.id.etSearchShop);
        rvCategories = view.findViewById(R.id.rvShopCategories);
        rvProducts = view.findViewById(R.id.rvShopProducts);
        swipeRefresh = view.findViewById(R.id.swipeRefreshShop);

        setupRecyclerViews();
        loadCategories();
        loadProducts();

        swipeRefresh.setOnRefreshListener(this::loadProducts);

        etSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                currentSearchKeyword = s.toString().trim();
                loadProducts();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        return view;
    }

    private void setupRecyclerViews() {
        categoryAdapter = new CategoryAdapter((category, position) -> {
            selectedCategoryId = category.getId() == 0 ? null : category.getId();
            loadProducts();
        });
        rvCategories.setLayoutManager(new LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false));
        rvCategories.setAdapter(categoryAdapter);

        productAdapter = new ProductAdapter(this);
        rvProducts.setLayoutManager(new GridLayoutManager(requireContext(), 2));
        rvProducts.setAdapter(productAdapter);
    }

    private void loadCategories() {
        apiService.getCategories().enqueue(new Callback<ApiResponse<List<Category>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<Category>>> call, Response<ApiResponse<List<Category>>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    List<Category> list = response.body().getData();
                    categoryAdapter.setCategories(list);
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<Category>>> call, Throwable t) {}
        });
    }

    private void loadProducts() {
        swipeRefresh.setRefreshing(true);
        String search = currentSearchKeyword.isEmpty() ? null : currentSearchKeyword;
        apiService.getProducts(selectedCategoryId, search, null).enqueue(new Callback<ApiResponse<ProductListData>>() {
            @Override
            public void onResponse(Call<ApiResponse<ProductListData>> call, Response<ApiResponse<ProductListData>> response) {
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    productAdapter.setProducts(response.body().getData().getProducts());
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<ProductListData>> call, Throwable t) {
                swipeRefresh.setRefreshing(false);
            }
        });
    }

    @Override
    public void onProductClick(Product product) {
        Intent intent = new Intent(requireContext(), ProductDetailActivity.class);
        intent.putExtra("product_id", String.valueOf(product.getId()));
        intent.putExtra("product_obj", product);
        startActivity(intent);
    }

    @Override
    public void onAddToCartClick(Product product) {
        Map<String, Object> body = new HashMap<>();
        body.put("product_id", product.getId());
        body.put("quantity", 1);

        apiService.addToCart(body).enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    Toast.makeText(requireContext(), "Đã thêm vào giỏ hàng!", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {}
        });
    }
}
