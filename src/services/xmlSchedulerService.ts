import { PrismaClient } from "@prisma/client";

const PLAN_LIMITS: Record<string, { products: number; catalogs: number; customers: number }> = {
  Starter: { products: 250, catalogs: 10, customers: 100 },
  Premium: { products: 1000, catalogs: 100, customers: 10000 },
  Pro: { products: 2500, catalogs: 250, customers: 25000 },
  Enterprise: { products: 10000, catalogs: 1000, customers: 100000 },
};

function getTenantLimits(planName?: string | null) {
  return PLAN_LIMITS[planName || "Starter"] || PLAN_LIMITS["Starter"];
}

// Helper to escape XML special characters
function escapeXml(unsafe: any): string {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Simple XML parser to convert standard product XML feed to array of key-value objects
export function parseProductXml(xmlText: string, itemTag = "item"): Array<Record<string, string>> {
  const items: Array<Record<string, string>> = [];
  
  // Find all repeating blocks of itemTag e.g. <item>...</item> or <urun>...</urun>
  const itemRegex = new RegExp(`<${itemTag}\\b[^>]*>([\\s\\S]*?)<\\/${itemTag}>`, "g");
  let match;
  
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];
    const itemData: Record<string, string> = {};
    
    // Find all single-level tags inside the repeating block
    const tagRegex = /<([^>\s]+)\b[^>]*>([\s\S]*?)<\/\1>/g;
    let tagMatch;
    
    while ((tagMatch = tagRegex.exec(itemContent)) !== null) {
      const tagName = tagMatch[1];
      const tagValue = tagMatch[2].replace(/<!\[CDATA\[([\s\\S]*?)\]\]>/g, "$1").trim();
      itemData[tagName] = tagValue;
    }
    
    // Support nested category/brand names if present in standard formats
    if (Object.keys(itemData).length > 0) {
      items.push(itemData);
    }
  }
  
  // If nothing matched, try fallback to common e-commerce item tags (urun, product, record)
  if (items.length === 0 && itemTag !== "urun" && xmlText.includes("<urun>")) {
    return parseProductXml(xmlText, "urun");
  }
  if (items.length === 0 && itemTag !== "product" && xmlText.includes("<product>")) {
    return parseProductXml(xmlText, "product");
  }
  
  return items;
}

// Function to generate the XML string for a tenant
async function getActiveProfile(prisma: PrismaClient, tenantId: string, profileId?: string | null) {
  if (profileId) {
    return prisma.xmlProfile.findFirst({ where: { id: profileId, tenantId } });
  }
  const fallback = await prisma.xmlProfile.findFirst({
    where: { tenantId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
  });
  return fallback;
}

export async function generateXmlExportString(prisma: PrismaClient, tenantId: string, profileId?: string | null): Promise<string> {
  const config = await getActiveProfile(prisma, tenantId, profileId);
  
  if (!config) {
    throw new Error("XML configuration not found for this tenant.");
  }
  
  let selectedFields: string[] = [];
  try {
    selectedFields = JSON.parse(config.exportFields || "[]");
    if (!Array.isArray(selectedFields)) selectedFields = [];
  } catch {
    selectedFields = [];
  }
  
  // Get all products
  const products = await prisma.product.findMany({
    where: { tenantId, xmlExportEnabled: true, status: { not: "DELETED" } as any },
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
      images: {
        where: { status: "active" },
        orderBy: { sortOrder: "asc" },
        select: { originalUrl: true, thumbUrl: true }
      },
      prices: {
        select: { price: true, priceListId: true }
      }
    }
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<products>\n`;

  for (const product of products) {
    xml += `  <product>\n`;
    xml += `    <id>${product.id}</id>\n`;
    
    // Determine price to output
    let outputPrice = product.price;
    if (config.exportPriceListId) {
      const selected = product.prices.find((p) => p.priceListId === config.exportPriceListId);
      if (selected) outputPrice = selected.price;
    }

    // Always output name, sku, barcode, stock, price, category, brand, and description if selected
    if (selectedFields.includes("name") || selectedFields.length === 0) {
      xml += `    <name>${escapeXml(product.name)}</name>\n`;
    }
    if (selectedFields.includes("sku") || selectedFields.length === 0) {
      xml += `    <sku>${escapeXml(product.sku)}</sku>\n`;
    }
    if (selectedFields.includes("barcode") || selectedFields.length === 0) {
      xml += `    <barcode>${escapeXml(product.barcode)}</barcode>\n`;
    }
    if (selectedFields.includes("price") || selectedFields.length === 0) {
      xml += `    <price>${outputPrice}</price>\n`;
    }
    if (selectedFields.includes("costPrice") || selectedFields.length === 0) {
      xml += `    <costPrice>${product.costPrice || ""}</costPrice>\n`;
    }
    if (selectedFields.includes("stock") || selectedFields.length === 0) {
      xml += `    <stock>${product.stock}</stock>\n`;
    }
    if ((selectedFields.includes("category") || selectedFields.length === 0) && product.category) {
      xml += `    <category>${escapeXml(product.category.name)}</category>\n`;
    }
    if ((selectedFields.includes("brand") || selectedFields.length === 0) && product.brand) {
      xml += `    <brand>${escapeXml(product.brand.name)}</brand>\n`;
    }
    if (selectedFields.includes("description") || selectedFields.length === 0) {
      xml += `    <description>${escapeXml(product.description)}</description>\n`;
    }
    if (selectedFields.includes("piecesPerBox") || selectedFields.length === 0) {
      xml += `    <piecesPerBox>${product.piecesPerBox || ""}</piecesPerBox>\n`;
    }
    if (selectedFields.includes("packagingType") || selectedFields.length === 0) {
      xml += `    <packagingType>${escapeXml(product.packagingType)}</packagingType>\n`;
    }
    const imageUrls = (product.images || [])
      .map((img) => img.originalUrl || img.thumbUrl)
      .filter(Boolean) as string[];
    const primaryImageUrl = imageUrls[0] || product.imageUrl || "";
    if (selectedFields.includes("imageUrl") || selectedFields.length === 0) {
      xml += `    <imageUrl>${escapeXml(primaryImageUrl)}</imageUrl>\n`;
    }
    if (selectedFields.includes("imageUrlsCsv")) {
      xml += `    <imageUrlsCsv>${escapeXml(imageUrls.join(","))}</imageUrlsCsv>\n`;
    }
    for (let i = 0; i < 10; i++) {
      const key = `imageUrl${i + 1}`;
      if (selectedFields.includes(key)) {
        xml += `    <${key}>${escapeXml(imageUrls[i] || "")}</${key}>\n`;
      }
    }

    const selectedDynamicPriceFields = selectedFields.filter((f) => f.startsWith("priceList_"));
    for (const dynamicField of selectedDynamicPriceFields) {
      const plId = dynamicField.replace("priceList_", "");
      const matchedPrice = product.prices.find((p) => p.priceListId === plId);
      xml += `    <${dynamicField}>${matchedPrice ? matchedPrice.price : ""}</${dynamicField}>\n`;
    }

    xml += `  </product>\n`;
  }

  xml += `</products>\n`;
  return xml;
}

// Compile XML export and save to DB cache
export async function runXmlExport(prisma: PrismaClient, tenantId: string, profileId?: string | null): Promise<{ success: boolean; error?: string; profileId?: string }> {
  console.log(`[XML Export] Running XML export cache compiler for tenant: ${tenantId}`);
  try {
    const config = await getActiveProfile(prisma, tenantId, profileId);
    if (!config) {
      return { success: false, error: "XML profil bulunamadı." };
    }

    const xmlString = await generateXmlExportString(prisma, tenantId, config.id);
    
    const now = new Date();
    const nextRun = config.exportIntervalMinutes > 0 
      ? new Date(now.getTime() + config.exportIntervalMinutes * 60000) 
      : null;

    await prisma.xmlProfile.update({
      where: { id: config.id },
      data: {
        cachedXml: xmlString,
        exportLastRun: now,
        exportNextRun: nextRun
      }
    });
    console.log(`[XML Export] Compiled successfully for tenant: ${tenantId}`);
    return { success: true, profileId: config.id };
  } catch (err: any) {
    console.error(`[XML Export Error] Tenant ${tenantId}:`, err);
    return { success: false, error: err?.message || "XML derleme hatası" };
  }
}

// Fetch external XML import URL and synchronize products
export async function runXmlImport(prisma: PrismaClient, tenantId: string, profileId?: string | null) {
  console.log(`[XML Import] Fetching & running XML import for tenant: ${tenantId}`);
  let config = await getActiveProfile(prisma, tenantId, profileId);
  if (!config || !config.importUrl) return;

  const now = new Date();
  
  // Set status to RUNNING to avoid concurrent updates
  await prisma.xmlProfile.update({
    where: { id: config.id },
    data: { importStatus: "RUNNING" }
  });

  try {
    // 1. Fetch XML
    const res = await fetch(config.importUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch XML. Status: ${res.status} ${res.statusText}`);
    }
    const xmlText = await res.text();
    
    // 2. Parse XML
    const mapping = JSON.parse(config.importFieldsMapping || "{}");
    const itemTag = mapping.itemTag || "item";
    
    const xmlItems = parseProductXml(xmlText, itemTag);
    if (xmlItems.length === 0) {
      throw new Error("Parsed 0 items. Please check if the XML format matches the repeating item tag.");
    }

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const logDetails: string[] = [];

    // Helper to fetch or create Category and Brand
    const getCategoryId = async (name: string): Promise<string | null> => {
      const cleanName = name.trim();
      if (!cleanName) return null;
      let cat = await prisma.category.findFirst({
        where: { name: cleanName, tenantId }
      });
      if (!cat) {
        cat = await prisma.category.create({
          data: { name: cleanName, tenantId }
        });
      }
      return cat.id;
    };

    const getBrandId = async (name: string): Promise<string | null> => {
      const cleanName = name.trim();
      if (!cleanName) return null;
      let brand = await prisma.brand.findFirst({
        where: { name: cleanName, tenantId }
      });
      if (!brand) {
        brand = await prisma.brand.create({
          data: { name: cleanName, tenantId }
        });
      }
      return brand.id;
    };

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { planName: true }
    });
    const limits = getTenantLimits(tenant?.planName);
    const maxProductsLimit = limits.products;
    let runningProductsCount = await prisma.product.count({ where: { tenantId } });

    // 3. Process products
    for (const item of xmlItems) {
      try {
        const normalizeKey = (v: string) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const itemEntries = Object.entries(item || {});
        const itemNormalizedMap = new Map<string, string>();
        for (const [k, v] of itemEntries) {
          const nk = normalizeKey(k);
          if (nk && !itemNormalizedMap.has(nk)) itemNormalizedMap.set(nk, String(v ?? ""));
        }
        const getMappedValue = (mappedTag: any): string => {
          const rawTag = String(mappedTag || "").trim();
          if (!rawTag) return "";
          if (item[rawTag] !== undefined && item[rawTag] !== null) return String(item[rawTag]);
          const nk = normalizeKey(rawTag);
          if (!nk) return "";
          return itemNormalizedMap.get(nk) || "";
        };
        const parseFlexibleNumber = (val: any): number | null => {
          if (val === undefined || val === null) return null;
          const raw = String(val).trim();
          if (!raw) return null;
          let cleaned = raw.replace(/[^\d,.\-]/g, "");
          if (!cleaned) return null;
          const lastComma = cleaned.lastIndexOf(",");
          const lastDot = cleaned.lastIndexOf(".");
          if (lastComma >= 0 && lastDot >= 0) {
            if (lastComma > lastDot) {
              cleaned = cleaned.replace(/\./g, "").replace(",", ".");
            } else {
              cleaned = cleaned.replace(/,/g, "");
            }
          } else if (lastComma >= 0) {
            cleaned = cleaned.replace(",", ".");
          }
          const num = Number(cleaned);
          return Number.isFinite(num) ? num : null;
        };

        // Extract fields using mapping
        const idVal = mapping.id ? String(getMappedValue(mapping.id) || "").trim() : "";
        const nameVal = mapping.name ? getMappedValue(mapping.name) : "";
        const skuVal = mapping.sku ? (getMappedValue(mapping.sku) || null) : null;
        const barcodeVal = mapping.barcode ? (getMappedValue(mapping.barcode) || null) : null;
        const priceVal = parseFlexibleNumber(mapping.price ? getMappedValue(mapping.price) : null) ?? 0;
        const costPriceVal = mapping.costPrice ? parseFlexibleNumber(getMappedValue(mapping.costPrice)) : null;
        const stockVal = Number.parseInt(String(mapping.stock ? getMappedValue(mapping.stock) : "0"), 10) || 0;
        const descVal = mapping.description ? getMappedValue(mapping.description) || "" : null;
        const categoryVal = mapping.category ? getMappedValue(mapping.category) || "" : "";
        const brandVal = mapping.brand ? getMappedValue(mapping.brand) || "" : "";
        const piecesPerBoxVal = mapping.piecesPerBox ? Number.parseInt(String(getMappedValue(mapping.piecesPerBox) || "0"), 10) || null : null;
        const packagingTypeVal = mapping.packagingType ? getMappedValue(mapping.packagingType) || null : null;
        const imageUrlVal =
          (mapping.imageUrl && getMappedValue(mapping.imageUrl)) ||
          (mapping.imageUrl1 && getMappedValue(mapping.imageUrl1)) ||
          "";
        const mappedPriceListEntries = Object.entries(mapping)
          .filter(([k, v]) => k.startsWith("priceList_") && typeof v === "string" && v.trim() !== "")
          .map(([k, v]) => {
            const parsed = parseFlexibleNumber(getMappedValue(v as string));
            return {
              priceListId: k.replace("priceList_", ""),
              price: parsed
            };
          })
          .filter((x) => x.price !== null && Number.isFinite(x.price as number)) as Array<{ priceListId: string; price: number }>;

        if (!nameVal) {
          logDetails.push(`Skipped: Missing name value for product with SKU: ${skuVal || "N/A"}`);
          failedCount++;
          continue;
        }

        // Match priority: id -> sku -> barcode -> normalized name
        let existingProduct = null;
        if (idVal) {
          existingProduct = await prisma.product.findFirst({
            where: { id: idVal, tenantId }
          });
        }
        if (!existingProduct && skuVal) {
          existingProduct = await prisma.product.findFirst({
            where: { sku: skuVal, tenantId }
          });
        }
        if (!existingProduct && barcodeVal) {
          existingProduct = await prisma.product.findFirst({
            where: { barcode: barcodeVal, tenantId }
          });
        }
        if (!existingProduct && nameVal) {
          const normalizedName = String(nameVal).trim();
          existingProduct = await prisma.product.findFirst({
            where: { tenantId, name: normalizedName }
          });
        }

        const categoryId = categoryVal ? await getCategoryId(categoryVal) : null;
        const brandId = brandVal ? await getBrandId(brandVal) : null;

        if (existingProduct) {
          // Update
          await prisma.$transaction(async (tx) => {
            const updated = await tx.product.update({
              where: { id: existingProduct.id },
              data: {
                name: nameVal,
                price: priceVal,
                costPrice: costPriceVal,
                stock: stockVal,
                description: descVal || existingProduct.description,
                categoryId: categoryId || existingProduct.categoryId,
                brandId: brandId || existingProduct.brandId,
                piecesPerBox: piecesPerBoxVal || existingProduct.piecesPerBox,
                packagingType: packagingTypeVal || existingProduct.packagingType,
                imageUrl: imageUrlVal || existingProduct.imageUrl
              }
            });
            await tx.product.update({
              where: { id: updated.id },
              data: { xmlSourceType: "XML_UPDATED", xmlProfileId: config.id, xmlLastSyncedAt: now }
            });

            // If a target price list is selected for import, update/upsert there as well
            if (config.importPriceListId) {
              await tx.productPrice.upsert({
                where: {
                  productId_priceListId: {
                    productId: updated.id,
                    priceListId: config.importPriceListId
                  }
                },
                create: {
                  productId: updated.id,
                  priceListId: config.importPriceListId,
                  price: priceVal,
                  tenantId
                },
                update: { price: priceVal }
              });
            }

            for (const mappedPrice of mappedPriceListEntries) {
              await tx.productPrice.upsert({
                where: {
                  productId_priceListId: {
                    productId: updated.id,
                    priceListId: mappedPrice.priceListId
                  }
                },
                create: {
                  productId: updated.id,
                  priceListId: mappedPrice.priceListId,
                  price: mappedPrice.price,
                  tenantId
                },
                update: { price: mappedPrice.price }
              });
            }
          });
          updatedCount++;
        } else {
          // Create
          if (runningProductsCount >= maxProductsLimit) {
            failedCount++;
            logDetails.push(`[Limit Aşımı] Ürün limiti aşıldı (${maxProductsLimit}). Ürün atlandı: ${nameVal}`);
            continue;
          }

          await prisma.$transaction(async (tx) => {
            const created = await tx.product.create({
              data: {
                name: nameVal,
                sku: skuVal,
                barcode: barcodeVal,
                price: priceVal,
                costPrice: costPriceVal,
                stock: stockVal,
                description: descVal,
                categoryId,
                brandId,
                piecesPerBox: piecesPerBoxVal,
                packagingType: packagingTypeVal,
                imageUrl: imageUrlVal || null,
                xmlSourceType: "XML_CREATED",
                xmlProfileId: config.id,
                xmlLastSyncedAt: now,
                tenantId
              }
            });

            // Insert custom price list if defined
            if (config.importPriceListId) {
              await tx.productPrice.create({
                data: {
                  productId: created.id,
                  priceListId: config.importPriceListId,
                  price: priceVal,
                  tenantId
                }
              });
            }

            for (const mappedPrice of mappedPriceListEntries) {
              await tx.productPrice.upsert({
                where: {
                  productId_priceListId: {
                    productId: created.id,
                    priceListId: mappedPrice.priceListId
                  }
                },
                create: {
                  productId: created.id,
                  priceListId: mappedPrice.priceListId,
                  price: mappedPrice.price,
                  tenantId
                },
                update: { price: mappedPrice.price }
              });
            }
          });
          createdCount++;
          runningProductsCount++;
        }
      } catch (err: any) {
        failedCount++;
        logDetails.push(`Error importing item: ${JSON.stringify(item)}. Reason: ${err.message}`);
      }
    }

    const nextRun = config.importIntervalMinutes > 0
      ? new Date(now.getTime() + config.importIntervalMinutes * 60000)
      : null;

    const summaryLog = `Imported successfully: ${createdCount} created, ${updatedCount} updated, ${failedCount} failed.\n\n` + logDetails.join("\n");

    const trimmedErrors = logDetails.slice(-200);
    await prisma.xmlProfile.update({
      where: { id: config.id },
      data: {
        importLastRun: now,
        importNextRun: nextRun,
        importStatus: "SUCCESS",
        importLog: summaryLog.slice(0, 10000),
        lastRunStats: JSON.stringify({ createdCount, updatedCount, failedCount, processed: xmlItems.length, finishedAt: now.toISOString() }),
        lastErrors: JSON.stringify(trimmedErrors)
      }
    });

    // Write audit log entry
    await prisma.auditLog.create({
      data: {
        tenantId,
        module: "XML Integration",
        action: "xml_import_success",
        status: "success",
        severity: "info",
        description: `Scheduled XML Import success. Parsed ${xmlItems.length} items. Created ${createdCount}, updated ${updatedCount}, failed ${failedCount}.`
      }
    });

    console.log(`[XML Import] Sync completed for tenant: ${tenantId}. Created: ${createdCount}, Updated: ${updatedCount}`);
  } catch (err: any) {
    console.error(`[XML Import Error] Tenant ${tenantId}:`, err);
    
    const nextRun = config.importIntervalMinutes > 0
      ? new Date(now.getTime() + config.importIntervalMinutes * 60000)
      : null;

    await prisma.xmlProfile.update({
      where: { id: config.id },
      data: {
        importLastRun: now,
        importNextRun: nextRun,
        importStatus: "FAILED",
        importLog: `Import failed at: ${now.toISOString()}\nError: ${err.message}`,
        lastRunStats: JSON.stringify({ createdCount: 0, updatedCount: 0, failedCount: 1, finishedAt: now.toISOString() }),
        lastErrors: JSON.stringify([`Error: ${err.message}`])
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        module: "XML Integration",
        action: "xml_import_failed",
        status: "failed",
        severity: "error",
        description: `Scheduled XML Import failed. Error: ${err.message}`
      }
    });
  }
}

// Background scheduler daemon
export function startXmlScheduler(prisma: PrismaClient) {
  console.log("[XML Scheduler] Initializing premium XML background scheduler daemon...");

  // Run the check every 60 seconds
  setInterval(async () => {
    try {
      const now = new Date();
      
      // Fetch all active xmlProfiles that are due
      const dueConfigs = await prisma.xmlProfile.findMany({
        where: {
          isActive: true,
          OR: [
            {
              exportIntervalMinutes: { gt: 0 },
              OR: [
                { exportNextRun: null },
                { exportNextRun: { lte: now } }
              ]
            },
            {
              importIntervalMinutes: { gt: 0 },
              OR: [
                { importNextRun: null },
                { importNextRun: { lte: now } }
              ]
            }
          ]
        },
        include: {
          tenant: {
            select: {
              isActive: true,
              modules: true
            }
          }
        }
      });

      for (const config of dueConfigs) {
        // Skip disabled or inactive tenants
        if (!config.tenant?.isActive) continue;
        
        // Ensure tenant has xmlIntegration premium module enabled
        let isLicensed = false;
        try {
          const modules = JSON.parse(config.tenant.modules || "{}");
          isLicensed = !!modules.xmlIntegration;
        } catch (e) {}
        
        if (!isLicensed) continue;

        // Run export compile if due
        if (config.exportIntervalMinutes > 0 && (!config.exportNextRun || config.exportNextRun <= now)) {
          void runXmlExport(prisma, config.tenantId, config.id);
        }

        // Run import sync if due (and not already running)
        if (config.importIntervalMinutes > 0 && (!config.importNextRun || config.importNextRun <= now) && config.importStatus !== "RUNNING") {
          void runXmlImport(prisma, config.tenantId, config.id);
        }
      }
    } catch (err) {
      console.error("[XML Scheduler Daemon Error]:", err);
    }
  }, 60000);
}
