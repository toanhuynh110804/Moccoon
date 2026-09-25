package com.moccoon.skincare.ui.fragments;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.card.MaterialCardView;
import com.moccoon.skincare.R;
import com.moccoon.skincare.data.api.ApiClient;
import com.moccoon.skincare.data.api.ApiService;
import com.moccoon.skincare.data.models.ApiResponse;
import com.moccoon.skincare.data.models.CartData;
import com.moccoon.skincare.ui.activities.CheckoutActivity;
import com.moccoon.skincare.ui.adapters.CartAdapter;
import com.moccoon.skincare.utils.CurrencyUtils;
import java.util.HashMap;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class CartFragment extends Fragment implements CartAdapter.OnCartItemChangeListener {
    private RecyclerView rvCart;
    private LinearLayout layoutEmpty;
    private MaterialCardView cardSummary;
    private TextView tvTotalAmount;
    private MaterialButton btnCheckout;

    private CartAdapter cartAdapter;
    private ApiService apiService;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_cart, container, false);

        apiService = ApiClient.getApiService(requireContext());

        rvCart = view.findViewById(R.id.rvCartItems);
        layoutEmpty = view.findViewById(R.id.layoutEmptyCart);
        cardSummary = view.findViewById(R.id.cardCartSummary);
        tvTotalAmount = view.findViewById(R.id.tvCartTotalAmount);
        btnCheckout = view.findViewById(R.id.btnProceedCheckout);

        cartAdapter = new CartAdapter(this);
        rvCart.setLayoutManager(new LinearLayoutManager(requireContext()));
        rvCart.setAdapter(cartAdapter);

        btnCheckout.setOnClickListener(v -> {
            Intent intent = new Intent(requireContext(), CheckoutActivity.class);
            startActivity(intent);
        });

        loadCart();

        return view;
    }

    @Override
    public void onResume() {
        super.onResume();
        loadCart();
    }

    private void loadCart() {
        apiService.getCart().enqueue(new Callback<ApiResponse<CartData>>() {
            @Override
            public void onResponse(Call<ApiResponse<CartData>> call, Response<ApiResponse<CartData>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    CartData data = response.body().getData();
                    if (data != null && data.getItems() != null && !data.getItems().isEmpty()) {
                        cartAdapter.setItems(data.getItems());
                        tvTotalAmount.setText(CurrencyUtils.formatVND(data.getTotalAmount()));
                        layoutEmpty.setVisibility(View.GONE);
                        rvCart.setVisibility(View.VISIBLE);
                        cardSummary.setVisibility(View.VISIBLE);
                    } else {
                        showEmptyState();
                    }
                } else {
                    showEmptyState();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<CartData>> call, Throwable t) {
                showEmptyState();
            }
        });
    }

    private void showEmptyState() {
        layoutEmpty.setVisibility(View.VISIBLE);
        rvCart.setVisibility(View.GONE);
        cardSummary.setVisibility(View.GONE);
    }

    @Override
    public void onQuantityChange(CartData.CartItem item, int newQuantity) {
        Map<String, Object> body = new HashMap<>();
        body.put("quantity", newQuantity);

        apiService.updateCartQuantity(item.getItemId(), body).enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                loadCart();
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {}
        });
    }

    @Override
    public void onItemDelete(CartData.CartItem item) {
        apiService.removeCartItem(item.getItemId()).enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                Toast.makeText(requireContext(), "Đã xóa sản phẩm khỏi giỏ!", Toast.LENGTH_SHORT).show();
                loadCart();
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {}
        });
    }
}
