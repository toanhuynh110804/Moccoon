package com.moccoon.skincare.ui.adapters;

import android.graphics.Paint;
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
import com.moccoon.skincare.data.models.Product;
import com.moccoon.skincare.utils.CurrencyUtils;
import java.util.ArrayList;
import java.util.List;

public class ProductAdapter extends RecyclerView.Adapter<ProductAdapter.ProductViewHolder> {
    private List<Product> products = new ArrayList<>();
    private final OnProductClickListener listener;

    public interface OnProductClickListener {
        void onProductClick(Product product);
        void onAddToCartClick(Product product);
    }

    public ProductAdapter(OnProductClickListener listener) {
        this.listener = listener;
    }

    public void setProducts(List<Product> products) {
        this.products = products != null ? products : new ArrayList<>();
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ProductViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_product, parent, false);
        return new ProductViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ProductViewHolder holder, int position) {
        Product product = products.get(position);
        holder.tvName.setText(product.getName());
        holder.tvPrice.setText(CurrencyUtils.formatVND(product.getPrice()));

        if (product.getOriginalPrice() != null && product.getOriginalPrice() > product.getPrice()) {
            holder.tvOriginalPrice.setText(CurrencyUtils.formatVND(product.getOriginalPrice()));
            holder.tvOriginalPrice.setPaintFlags(holder.tvOriginalPrice.getPaintFlags() | Paint.STRIKE_THRU_TEXT_FLAG);
            holder.tvOriginalPrice.setVisibility(View.VISIBLE);
        } else {
            holder.tvOriginalPrice.setVisibility(View.GONE);
        }

        if (product.getVolume() != null && !product.getVolume().isEmpty()) {
            holder.tvVolume.setText(product.getVolume());
            holder.tvVolume.setVisibility(View.VISIBLE);
        } else {
            holder.tvVolume.setVisibility(View.GONE);
        }

        Glide.with(holder.itemView.getContext())
                .load(product.getPrimaryImage())
                .placeholder(R.drawable.bg_search_bar)
                .into(holder.ivImage);

        holder.itemView.setOnClickListener(v -> {
            if (listener != null) listener.onProductClick(product);
        });

        holder.btnQuickAdd.setOnClickListener(v -> {
            if (listener != null) listener.onAddToCartClick(product);
        });
    }

    @Override
    public int getItemCount() {
        return products.size();
    }

    static class ProductViewHolder extends RecyclerView.ViewHolder {
        ImageView ivImage;
        TextView tvName, tvPrice, tvOriginalPrice, tvVolume, tvRating;
        ImageButton btnQuickAdd;

        public ProductViewHolder(@NonNull View itemView) {
            super(itemView);
            ivImage = itemView.findViewById(R.id.ivProductImage);
            tvName = itemView.findViewById(R.id.tvProductName);
            tvPrice = itemView.findViewById(R.id.tvProductPrice);
            tvOriginalPrice = itemView.findViewById(R.id.tvProductOriginalPrice);
            tvVolume = itemView.findViewById(R.id.tvVolumeTag);
            tvRating = itemView.findViewById(R.id.tvRating);
            btnQuickAdd = itemView.findViewById(R.id.btnQuickAddToCart);
        }
    }
}
