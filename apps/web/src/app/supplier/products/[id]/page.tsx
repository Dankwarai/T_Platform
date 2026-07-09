"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getStorageImageUrl } from "@/lib/storage-image-url";

type Category = { id: string; name: string };
type Variant = {
  id: string;
  variant_name: string;
  unit_type: string;
  price: number;
  stock_quantity: number;
  sku: string | null;
};

const UNIT_TYPES = ["yard", "meter", "piece", "kg"];

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [newVariant, setNewVariant] = useState({
    variant_name: "",
    unit_type: "yard",
    price: "",
    stock_quantity: "",
    sku: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();

    const { data: allCategories } = await supabase
      .from("product_categories")
      .select("id, name")
      .order("name");
    setCategories(allCategories ?? []);

    const { data: product } = await supabase
      .from("products")
      .select("name, category_id, description, images")
      .eq("id", id)
      .single();

    if (product) {
      setName(product.name);
      setCategoryId(product.category_id);
      setDescription(product.description ?? "");
      setImages(product.images ?? []);
    }

    const { data: productVariants } = await supabase
      .from("product_variants")
      .select("id, variant_name, unit_type, price, stock_quantity, sku")
      .eq("product_id", id)
      .order("variant_name");
    setVariants(productVariants ?? []);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ name, category_id: categoryId, description: description || null })
      .eq("id", id);

    if (error) {
      setError(error.message);
    }
    setPending(false);
  }

  async function handleUploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const nextImages = [...images, path];
    const { error: updateError } = await supabase
      .from("products")
      .update({ images: nextImages })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    setImages(nextImages);
    setUploading(false);
  }

  async function handleDeleteImage(path: string) {
    setUploading(true);
    setError(null);

    const supabase = createClient();
    await supabase.storage.from("product-images").remove([path]);

    const nextImages = images.filter((p) => p !== path);
    const { error: updateError } = await supabase
      .from("products")
      .update({ images: nextImages })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    setImages(nextImages);
    setUploading(false);
  }

  async function handleAddVariant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.from("product_variants").insert({
      product_id: id,
      variant_name: newVariant.variant_name,
      unit_type: newVariant.unit_type,
      price: Number(newVariant.price),
      stock_quantity: Number(newVariant.stock_quantity || 0),
      sku: newVariant.sku || null,
    });

    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }

    setNewVariant({
      variant_name: "",
      unit_type: "yard",
      price: "",
      stock_quantity: "",
      sku: "",
    });
    await load();
    setPending(false);
  }

  async function handleUpdateVariant(variant: Variant) {
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("product_variants")
      .update({
        variant_name: variant.variant_name,
        unit_type: variant.unit_type,
        price: variant.price,
        stock_quantity: variant.stock_quantity,
        sku: variant.sku || null,
      })
      .eq("id", variant.id);

    if (error) {
      setError(error.message);
    }
    setPending(false);
  }

  async function handleDeleteVariant(variantId: string) {
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", variantId);

    if (error) {
      // Fails if the variant is referenced by existing order_items — that's
      // expected, order history keeps its FK to the variant it was bought at.
      setError(error.message);
      setPending(false);
      return;
    }

    await load();
    setPending(false);
  }

  function updateVariantField(
    variantId: string,
    field: keyof Variant,
    value: string,
  ) {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? {
              ...v,
              [field]:
                field === "price" || field === "stock_quantity"
                  ? Number(value)
                  : value,
            }
          : v,
      ),
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-6 py-10 dark:bg-slate-900">
      <div className="flex w-full max-w-lg flex-col gap-8">
        <button
          onClick={() => router.push("/supplier/products")}
          className="self-start text-sm text-slate-600 underline dark:text-slate-400"
        >
          ← Back to products
        </button>

        <form onSubmit={handleSaveProduct} className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
            Edit product
          </h1>

          <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
            Name
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
            Category
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
            Description (optional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-full bg-accent px-5 text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            Save product
          </button>
        </form>

        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-slate-800 dark:text-slate-50">
            Images
          </h2>

          {images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {images.map((path) => (
                <div key={path} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getStorageImageUrl("product-images", path)}
                    alt=""
                    className="h-24 w-24 rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(path)}
                    disabled={uploading}
                    className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-600 text-xs text-white disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="flex h-10 w-fit cursor-pointer items-center rounded-full border border-slate-200 px-4 text-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            {uploading ? "Uploading..." : "Add image"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleUploadImage}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-slate-800 dark:text-slate-50">
            Variants
          </h2>

          {variants.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No variants yet — customers can&apos;t buy this product until
              you add at least one.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {variants.map((variant) => (
                <li
                  key={variant.id}
                  className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Variant name"
                      value={variant.variant_name}
                      onChange={(e) =>
                        updateVariantField(
                          variant.id,
                          "variant_name",
                          e.target.value,
                        )
                      }
                      className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                    />
                    <select
                      value={variant.unit_type}
                      onChange={(e) =>
                        updateVariantField(
                          variant.id,
                          "unit_type",
                          e.target.value,
                        )
                      }
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                    >
                      {UNIT_TYPES.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Price"
                      value={variant.price}
                      onChange={(e) =>
                        updateVariantField(variant.id, "price", e.target.value)
                      }
                      className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Stock"
                      value={variant.stock_quantity}
                      onChange={(e) =>
                        updateVariantField(
                          variant.id,
                          "stock_quantity",
                          e.target.value,
                        )
                      }
                      className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                    />
                    <input
                      type="text"
                      placeholder="SKU (optional)"
                      value={variant.sku ?? ""}
                      onChange={(e) =>
                        updateVariantField(variant.id, "sku", e.target.value)
                      }
                      className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleUpdateVariant(variant)}
                      className="h-8 flex-1 rounded-full bg-accent px-3 text-xs text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleDeleteVariant(variant.id)}
                      className="h-8 rounded-full border border-red-600 px-3 text-xs text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={handleAddVariant}
            className="flex flex-col gap-2 rounded-md border border-dashed border-slate-300 p-3 dark:border-slate-700"
          >
            <h3 className="text-sm font-medium text-slate-800 dark:text-slate-50">
              Add a variant
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Variant name (e.g. White)"
                value={newVariant.variant_name}
                onChange={(e) =>
                  setNewVariant((prev) => ({
                    ...prev,
                    variant_name: e.target.value,
                  }))
                }
                className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
              />
              <select
                value={newVariant.unit_type}
                onChange={(e) =>
                  setNewVariant((prev) => ({
                    ...prev,
                    unit_type: e.target.value,
                  }))
                }
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
              >
                {UNIT_TYPES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                required
                min={0}
                step="0.01"
                placeholder="Price"
                value={newVariant.price}
                onChange={(e) =>
                  setNewVariant((prev) => ({ ...prev, price: e.target.value }))
                }
                className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Stock"
                value={newVariant.stock_quantity}
                onChange={(e) =>
                  setNewVariant((prev) => ({
                    ...prev,
                    stock_quantity: e.target.value,
                  }))
                }
                className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
              />
              <input
                type="text"
                placeholder="SKU (optional)"
                value={newVariant.sku}
                onChange={(e) =>
                  setNewVariant((prev) => ({ ...prev, sku: e.target.value }))
                }
                className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="h-9 rounded-full border border-slate-200 px-4 text-sm transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Add variant
            </button>
          </form>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
