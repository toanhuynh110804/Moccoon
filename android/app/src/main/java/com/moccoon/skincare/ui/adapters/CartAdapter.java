package com.moccoon.skincare.ui.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.bumptech.glide.Glide;
import com.moccoon.skincare.R;
import com.moccoon.skincare.data.models.CartData;
import com.moccoon.skincare.utils.CurrencyUtils;
import java.util.ArrayList;
import java.util.List;

public class CartAdapter extends RecyclerView.Adapter<CartAdapter.CartViewHolder> {
    private List<CartData.CartItem> items = new ArrayList<>();
    private final OnCartItemChangeListener listener;

    public interface OnCartItemChangeListener {
        void onQuantityChange(CartData.CartItem item, int newQuantity);
        void onItemDelete(CartData.CartItem item);
    }

    public CartAdapter(OnCartItemChangeListener listener) {
        this.listener = listener;
    }

    public void setItems(List<CartData.CartItem> items) {
        this.items = items != null ? items : new ArrayList<>();
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public CartViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_cart, parent, false);
        return new CartViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull CartViewHolder holder, int position) {
        CartData.CartItem item = items.get(position);
        holder.tvName.setText(item.getProductName());
        holder.tvPrice.setText(CurrencyUtils.formatVND(item.getPrice()));
        holder.tvQuantity.setText(String.valueOf(item.getQuantity()));

        Glide.with(holder.itemView.getContext())
                .load(item.getProductImage())
                .placeholder(R.drawable.bg_search_bar)
                .into(holder.ivImage);

        holder.btnPlus.setOnClickListener(v -> {
            if (listener != null) listener.onQuantityChange(item, item.getQuantity() + 1);
        });

        holder.btnMinus.setOnClickListener(v -> {
            if (item.getQuantity() > 1) {
                if (listener != null) listener.onQuantityChange(item, item.getQuantity() - 1);
            } else {
                if (listener != null) listener.onItemDelete(item);
            }
        });

        holder.btnDelete.setOnClickListener(v -> {
            if (listener != null) listener.onItemDelete(item);
        });
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class CartViewHolder extends RecyclerView.ViewHolder {
        ImageView ivImage;
        TextView tvName, tvPrice, tvQuantity;
        ImageButton btnMinus, btnPlus, btnDelete;

        public CartViewHolder(@NonNull View itemView) {
            super(itemView);
            ivImage = itemView.findViewById(R.id.ivCartProductImage);
            tvName = itemView.findViewById(R.id.tvCartProductName);
            tvPrice = itemView.findViewById(R.id.tvCartProductPrice);
            tvQuantity = itemView.findViewById(R.id.tvCartQuantity);
            btnMinus = itemView.findViewById(R.id.btnCartMinus);
            btnPlus = itemView.findViewById(R.id.btnCartPlus);
            btnDelete = itemView.findViewById(R.id.btnCartDelete);
        }
    }
}
