package com.moccoon.skincare.ui.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.bumptech.glide.Glide;
import com.moccoon.skincare.R;
import com.moccoon.skincare.data.models.Banner;
import java.util.ArrayList;
import java.util.List;

public class BannerAdapter extends RecyclerView.Adapter<BannerAdapter.BannerViewHolder> {
    private List<Banner> banners = new ArrayList<>();
    private final OnBannerClickListener listener;

    public interface OnBannerClickListener {
        void onBannerClick(Banner banner);
    }

    public BannerAdapter(OnBannerClickListener listener) {
        this.listener = listener;
    }

    public void setBanners(List<Banner> banners) {
        this.banners = banners != null ? banners : new ArrayList<>();
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public BannerViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_banner, parent, false);
        return new BannerViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull BannerViewHolder holder, int position) {
        Banner banner = banners.get(position);
        holder.tvTitle.setText(banner.getTitle());
        holder.tvSubtitle.setText(banner.getSubtitle());
        if (banner.getBadgeText() != null && !banner.getBadgeText().isEmpty()) {
            holder.tvBadge.setText(banner.getBadgeText());
            holder.tvBadge.setVisibility(View.VISIBLE);
        } else {
            holder.tvBadge.setVisibility(View.GONE);
        }

        Glide.with(holder.itemView.getContext())
                .load(banner.getImageUrl())
                .placeholder(R.drawable.bg_search_bar)
                .into(holder.ivImage);

        holder.itemView.setOnClickListener(v -> {
            if (listener != null) listener.onBannerClick(banner);
        });
    }

    @Override
    public int getItemCount() {
        return banners.size();
    }

    static class BannerViewHolder extends RecyclerView.ViewHolder {
        ImageView ivImage;
        TextView tvTitle, tvSubtitle, tvBadge;

        public BannerViewHolder(@NonNull View itemView) {
            super(itemView);
            ivImage = itemView.findViewById(R.id.ivBannerImage);
            tvTitle = itemView.findViewById(R.id.tvBannerTitle);
            tvSubtitle = itemView.findViewById(R.id.tvBannerSubtitle);
            tvBadge = itemView.findViewById(R.id.tvBannerBadge);
        }
    }
}
