package com.moccoon.skincare.ui.fragments;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.viewpager2.widget.ViewPager2;
import com.moccoon.skincare.R;
import com.moccoon.skincare.data.api.ApiClient;
import com.moccoon.skincare.data.api.ApiService;
import com.moccoon.skincare.data.models.ApiResponse;
import com.moccoon.skincare.data.models.HomeData;
import com.moccoon.skincare.data.models.Product;
import com.moccoon.skincare.ui.activities.MainActivity;
import com.moccoon.skincare.ui.activities.ProductDetailActivity;
import com.moccoon.skincare.ui.adapters.BannerAdapter;
import com.moccoon.skincare.ui.adapters.CategoryAdapter;
import com.moccoon.skincare.ui.adapters.ProductAdapter;
import com.moccoon.skincare.utils.SessionManager;
import java.util.HashMap;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class HomeFragment extends Fragment implements ProductAdapter.OnProductClickListener {
    private SwipeRefreshLayout swipeRefresh;
    private ViewPager2 viewPagerBanners;
    private RecyclerView rvCategories, rvFeaturedProducts, rvAllProducts;
    private TextView tvGreeting;

    private BannerAdapter bannerAdapter;
    private CategoryAdapter categoryAdapter;
    private ProductAdapter featuredAdapter;
    private ProductAdapter allProductsAdapter;

    private ApiService apiService;
    private SessionManager sessionManager;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_home, container, false);

        apiService = ApiClient.getApiService(requireContext());
        sessionManager = new SessionManager(requireContext());

        initViews(view);
        setupAdapters();
        loadHomeData();

        swipeRefresh.setOnRefreshListener(this::loadHomeData);

        return view;
    }

    private void initViews(View view) {
        swipeRefresh = view.findViewById(R.id.swipeRefreshHome);
        viewPagerBanners = view.findViewById(R.id.viewPagerBanners);
        rvCategories = view.findViewById(R.id.rvCategories);
        rvFeaturedProducts = view.findViewById(R.id.rvFeaturedProducts);
        rvAllProducts = view.findViewById(R.id.rvAllProducts);
        tvGreeting = view.findViewById(R.id.tvGreeting);

        tvGreeting.setText("Xin chào, " + sessionManager.getFullName() + "!");

        view.findViewById(R.id.layoutSearchBar).setOnClickListener(v -> {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).selectTab(R.id.nav_shop);
            }
        });
    }

    private void setupAdapters() {
        bannerAdapter = new BannerAdapter(banner -> {
            Toast.makeText(requireContext(), banner.getTitle(), Toast.LENGTH_SHORT).show();
        });
        viewPagerBanners.setAdapter(bannerAdapter);

        categoryAdapter = new CategoryAdapter((category, position) -> {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).selectTab(R.id.nav_shop);
            }
        });
        rvCategories.setAdapter(categoryAdapter);

        featuredAdapter = new ProductAdapter(this);
        rvFeaturedProducts.setLayoutManager(new LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false));
        rvFeaturedProducts.setAdapter(featuredAdapter);

        allProductsAdapter = new ProductAdapter(this);
        rvAllProducts.setLayoutManager(new GridLayoutManager(requireContext(), 2));
        rvAllProducts.setAdapter(allProductsAdapter);
    }

    private void loadHomeData() {
        swipeRefresh.setRefreshing(true);
        apiService.getHomeData().enqueue(new Callback<ApiResponse<HomeData>>() {
            @Override
            public void onResponse(Call<ApiResponse<HomeData>> call, Response<ApiResponse<HomeData>> response) {
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    HomeData data = response.body().getData();
                    bannerAdapter.setBanners(data.getBanners());
                    categoryAdapter.setCategories(data.getCategories());
                    featuredAdapter.setProducts(data.getFeaturedProducts());
                    allProductsAdapter.setProducts(data.getFeaturedProducts());
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<HomeData>> call, Throwable t) {
                swipeRefresh.setRefreshing(false);
                Toast.makeText(requireContext(), "Lỗi kết nối máy chủ: " + t.getMessage(), Toast.LENGTH_SHORT).show();
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
                    Toast.makeText(requireContext(), "Đã thêm \"" + product.getName() + "\" vào giỏ hàng!", Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(requireContext(), "Không thể thêm vào giỏ hàng", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                Toast.makeText(requireContext(), "Lỗi mạng: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }
}
