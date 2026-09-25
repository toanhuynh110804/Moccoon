package com.moccoon.skincare.ui.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.moccoon.skincare.R;
import com.moccoon.skincare.data.models.Order;
import com.moccoon.skincare.utils.CurrencyUtils;
import java.util.ArrayList;
import java.util.List;

public class OrderAdapter extends RecyclerView.Adapter<OrderAdapter.OrderViewHolder> {
    private List<Order> orders = new ArrayList<>();
    private final OnOrderClickListener listener;

    public interface OnOrderClickListener {
        void onOrderClick(Order order);
    }

    public OrderAdapter(OnOrderClickListener listener) {
        this.listener = listener;
    }

    public void setOrders(List<Order> orders) {
        this.orders = orders != null ? orders : new ArrayList<>();
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public OrderViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_order, parent, false);
        return new OrderViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull OrderViewHolder holder, int position) {
        Order order = orders.get(position);
        holder.tvCode.setText("#" + order.getOrderCode());
        holder.tvAmount.setText(CurrencyUtils.formatVND(order.getFinalAmount()));
        holder.tvDate.setText(order.getCreatedAt() != null ? order.getCreatedAt().substring(0, Math.min(16, order.getCreatedAt().length())).replace("T", " ") : "");

        int itemsCount = order.getItems() != null ? order.getItems().size() : 1;
        holder.tvItemsCount.setText(itemsCount + " sản phẩm");

        // Format trạng thái
        String status = order.getOrderStatus();
        if ("PENDING".equalsIgnoreCase(status)) {
            holder.tvStatus.setText("ĐANG XỬ LÝ");
            holder.tvStatus.setBackgroundResource(R.drawable.bg_badge_orange);
        } else if ("PREPARING".equalsIgnoreCase(status)) {
            holder.tvStatus.setText("ĐANG CHUẨN BỊ");
            holder.tvStatus.setBackgroundResource(R.drawable.bg_floating_chat);
        } else if ("SHIPPING".equalsIgnoreCase(status)) {
            holder.tvStatus.setText("ĐANG GIAO HÀNG");
            holder.tvStatus.setBackgroundResource(R.drawable.bg_floating_chat);
        } else if ("DELIVERED".equalsIgnoreCase(status)) {
            holder.tvStatus.setText("ĐÃ GIAO THÀNH CÔNG");
            holder.tvStatus.setBackgroundResource(R.drawable.bg_floating_chat);
        } else if ("CANCELLED".equalsIgnoreCase(status)) {
            holder.tvStatus.setText("ĐÃ HỦY ĐƠN");
            holder.tvStatus.setBackgroundResource(R.drawable.bg_badge_orange);
        }

        holder.itemView.setOnClickListener(v -> {
            if (listener != null) listener.onOrderClick(order);
        });
    }

    @Override
    public int getItemCount() {
        return orders.size();
    }

    static class OrderViewHolder extends RecyclerView.ViewHolder {
        TextView tvCode, tvStatus, tvDate, tvItemsCount, tvAmount;

        public OrderViewHolder(@NonNull View itemView) {
            super(itemView);
            tvCode = itemView.findViewById(R.id.tvOrderCode);
            tvStatus = itemView.findViewById(R.id.tvOrderStatusBadge);
            tvDate = itemView.findViewById(R.id.tvOrderDate);
            tvItemsCount = itemView.findViewById(R.id.tvOrderItemsCount);
            tvAmount = itemView.findViewById(R.id.tvOrderFinalAmount);
        }
    }
}
