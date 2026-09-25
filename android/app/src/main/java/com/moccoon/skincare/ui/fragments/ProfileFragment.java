package com.moccoon.skincare.ui.fragments;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.button.MaterialButton;
import com.moccoon.skincare.R;
import com.moccoon.skincare.data.api.ApiClient;
import com.moccoon.skincare.data.api.ApiService;
import com.moccoon.skincare.data.models.ApiResponse;
import com.moccoon.skincare.data.models.Order;
import com.moccoon.skincare.ui.activities.AdminDashboardActivity;
import com.moccoon.skincare.ui.activities.AuthActivity;
import com.moccoon.skincare.ui.activities.OrderDetailActivity;
import com.moccoon.skincare.ui.adapters.OrderAdapter;
import com.moccoon.skincare.utils.SessionManager;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ProfileFragment extends Fragment {
    private TextView tvName, tvEmail, tvRole, tvEmptyOrders;
    private MaterialButton btnAdminDashboard, btnLogout;
    private RecyclerView rvOrders;

    private OrderAdapter orderAdapter;
    private ApiService apiService;
    private SessionManager sessionManager;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_profile, container, false);

        apiService = ApiClient.getApiService(requireContext());
        sessionManager = new SessionManager(requireContext());

        tvName = view.findViewById(R.id.tvProfileName);
        tvEmail = view.findViewById(R.id.tvProfileEmail);
        tvRole = view.findViewById(R.id.tvProfileRole);
        tvEmptyOrders = view.findViewById(R.id.tvEmptyOrders);
        btnAdminDashboard = view.findViewById(R.id.btnOpenAdminDashboard);
        btnLogout = view.findViewById(R.id.btnLogout);
        rvOrders = view.findViewById(R.id.rvOrderHistory);

        tvName.setText(sessionManager.getFullName());
        tvEmail.setText(sessionManager.getEmail().isEmpty() ? sessionManager.getPhone() : sessionManager.getEmail());

        if (sessionManager.isAdmin()) {
            tvRole.setText("QUẢN TRỊ VIÊN");
            btnAdminDashboard.setVisibility(View.VISIBLE);
            btnAdminDashboard.setOnClickListener(v -> {
                startActivity(new Intent(requireContext(), AdminDashboardActivity.class));
            });
        } else {
            tvRole.setText("THÀNH VIÊN");
            btnAdminDashboard.setVisibility(View.GONE);
        }

        orderAdapter = new OrderAdapter(order -> {
            Intent intent = new Intent(requireContext(), OrderDetailActivity.class);
            intent.putExtra("order_id", String.valueOf(order.getId()));
            intent.putExtra("order_obj", order);
            startActivity(intent);
        });
        rvOrders.setLayoutManager(new LinearLayoutManager(requireContext()));
        rvOrders.setAdapter(orderAdapter);

        btnLogout.setOnClickListener(v -> {
            sessionManager.logout();
            Intent intent = new Intent(requireContext(), AuthActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
        });

        loadOrderHistory();

        return view;
    }

    @Override
    public void onResume() {
        super.onResume();
        loadOrderHistory();
    }

    private void loadOrderHistory() {
        apiService.getMyOrders().enqueue(new Callback<ApiResponse<List<Order>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<Order>>> call, Response<ApiResponse<List<Order>>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    List<Order> orders = response.body().getData();
                    if (orders != null && !orders.isEmpty()) {
                        orderAdapter.setOrders(orders);
                        tvEmptyOrders.setVisibility(View.GONE);
                        rvOrders.setVisibility(View.VISIBLE);
                    } else {
                        tvEmptyOrders.setVisibility(View.VISIBLE);
                        rvOrders.setVisibility(View.GONE);
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<Order>>> call, Throwable t) {}
        });
    }
}
