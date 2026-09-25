package com.moccoon.skincare.data.models;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class Product implements Serializable {
    @SerializedName("id")
    private int id;

    @SerializedName("category_id")
    private int categoryId;

    @SerializedName("name")
    private String name;

    @SerializedName("slug")
    private String slug;

    @SerializedName("price")
    private double price;

    @SerializedName("original_price")
    private Double originalPrice;

    @SerializedName("stock_quantity")
    private int stockQuantity;

    @SerializedName("volume")
    private String volume;

    @SerializedName("skin_type")
    private String skinType;

    @SerializedName("short_description")
    private String shortDescription;

    @SerializedName("description")
    private String description;

    @SerializedName("ingredients")
    private String ingredients;

    @SerializedName("benefits")
    private String benefits;

    @SerializedName("usage_instructions")
    private String usageInstructions;

    @SerializedName("is_featured")
    private boolean isFeatured;

    @SerializedName("primary_image")
    private String primaryImage;

    @SerializedName("category_name")
    private String categoryName;

    public int getId() { return id; }
    public int getCategoryId() { return categoryId; }
    public String getName() { return name; }
    public String getSlug() { return slug; }
    public double getPrice() { return price; }
    public Double getOriginalPrice() { return originalPrice; }
    public int getStockQuantity() { return stockQuantity; }
    public String getVolume() { return volume; }
    public String getSkinType() { return skinType; }
    public String getShortDescription() { return shortDescription; }
    public String getDescription() { return description; }
    public String getIngredients() { return ingredients; }
    public String getBenefits() { return benefits; }
    public String getUsageInstructions() { return usageInstructions; }
    public boolean isFeatured() { return isFeatured; }
    public String getPrimaryImage() {
        if (primaryImage != null && primaryImage.startsWith("/")) {
            return com.moccoon.skincare.utils.Constants.SOCKET_URL + primaryImage;
        }
        return primaryImage;
    }
    public String getCategoryName() { return categoryName; }
}
