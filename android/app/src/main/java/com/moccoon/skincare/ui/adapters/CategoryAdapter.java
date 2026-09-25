package com.moccoon.skincare.ui.adapters;

import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;
import com.moccoon.skincare.R;
import com.moccoon.skincare.data.models.Category;
import java.util.ArrayList;
import java.util.List;

public class CategoryAdapter extends RecyclerView.Adapter<CategoryAdapter.CategoryViewHolder> {
    private List<Category> categories = new ArrayList<>();
    private int selectedPosition = 0;
    private final OnCategoryClickListener listener;

    public interface OnCategoryClickListener {
        void onCategoryClick(Category category, int position);
    }

    public CategoryAdapter(OnCategoryClickListener listener) {
        this.listener = listener;
    }

    public void setCategories(List<Category> categories) {
        this.categories = categories != null ? categories : new ArrayList<>();
        notifyDataSetChanged();
    }

    public void setSelectedPosition(int position) {
        int previous = selectedPosition;
        selectedPosition = position;
        notifyItemChanged(previous);
        notifyItemChanged(selectedPosition);
    }

    @NonNull
    @Override
    public CategoryViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_category, parent, false);
        return new CategoryViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull CategoryViewHolder holder, int position) {
        Category category = categories.get(position);
        holder.tvName.setText(category.getName());

        boolean isSelected = position == selectedPosition;
        if (isSelected) {
            holder.layoutPill.setBackgroundResource(R.drawable.bg_floating_chat);
            holder.tvName.setTextColor(Color.WHITE);
        } else {
            holder.layoutPill.setBackgroundResource(R.drawable.bg_category_pill);
            holder.tvName.setTextColor(ContextCompat.getColor(holder.itemView.getContext(), R.color.text_primary));
        }

        holder.itemView.setOnClickListener(v -> {
            setSelectedPosition(holder.getAdapterPosition());
            if (listener != null) listener.onCategoryClick(category, holder.getAdapterPosition());
        });
    }

    @Override
    public int getItemCount() {
        return categories.size();
    }

    static class CategoryViewHolder extends RecyclerView.ViewHolder {
        LinearLayout layoutPill;
        TextView tvName;

        public CategoryViewHolder(@NonNull View itemView) {
            super(itemView);
            layoutPill = itemView.findViewById(R.id.layoutCategoryPill);
            tvName = itemView.findViewById(R.id.tvCategoryName);
        }
    }
}
