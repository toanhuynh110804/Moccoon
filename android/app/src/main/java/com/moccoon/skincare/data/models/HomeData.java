package com.moccoon.skincare.data.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class HomeData {
    @SerializedName("banners")
    private List<Banner> banners;

    @SerializedName("categories")
    private List<Category> categories;

    @SerializedName("featured_products")
    private List<Product> featuredProducts;

    public List<Banner> getBanners() { return banners; }
    public List<Category> getCategories() { return categories; }
    public List<Product> getFeaturedProducts() { return featuredProducts; }
}
