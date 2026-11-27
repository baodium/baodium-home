"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactElement } from "react";
import { ArrowRight, CheckCircle2, Home } from "lucide-react";
import { TITLES } from "@/lib/products/northlight";
import { loadProductProgress, productProgressServer, subscribeProductProgress } from "@/lib/products/progress";
import { PRODUCTS, PRODUCT_ORDER } from "@/lib/products/registry";
import type { ProductId } from "@/lib/products/types";
import { ProductArt } from "@/components/products/larder/ProductArt";
import { Still } from "@/components/products/northlight/Still";

function LarderPreview() {
  return (
    <div className="hub-preview hub-larder" aria-hidden="true">
      <div className="hub-larder-bar">
        <span className="hub-larder-mark">Larder</span>
        <span>Shop</span>
        <span>Orders</span>
        <span className="hub-larder-cart">Cart · 2</span>
      </div>
      <div className="hub-larder-body">
        <div className="hub-larder-items">
          <p className="hub-larder-heading">Your cart</p>
          {[
            ["olive-oil", "Arbequina olive oil", "$18.95"],
            ["sea-salt", "Flaky sea salt", "$4.35"],
          ].map(([sku, name, price]) => (
            <div key={sku} className="hub-larder-item">
              <ProductArt sku={sku} />
              <span>
                {name}
                <small>{price}</small>
              </span>
            </div>
          ))}
        </div>
        <div className="hub-larder-pay">
          <p>
            Subtotal <span>$23.30</span>
          </p>
          <p>
            Shipping <span>$5.95</span>
          </p>
          <p className="hub-larder-total">
            Total <strong>$29.24</strong>
          </p>
          <span className="hub-larder-button">Pay $29.24</span>
          <p className="hub-larder-alert">We couldn’t take payment for this order. Reference chk_7f3a2c.</p>
        </div>
      </div>
    </div>
  );
}

function NorthlightPreview() {
  const title = TITLES[0];
  return (
    <div className="hub-preview hub-northlight" aria-hidden="true">
      <Still title={title} t={24} className="hub-northlight-still" />
      <div className="hub-northlight-top">
        <span>✦ Northlight</span>
        <span>{title.name}</span>
      </div>
      <span className="hub-northlight-spinner" />
      <div className="hub-northlight-controls">
        <span className="hub-northlight-progress">
          <i />
        </span>
        <span>
          4:12 / 1:32:00 <b>HD 1080p</b>
        </span>
      </div>
    </div>
  );
}

function PorchPreview() {
  return (
    <div className="hub-preview hub-porch" aria-hidden="true">
      <div className="hub-porch-card">
        <span className="hub-porch-mark">
          <Home size={13} />
        </span>
        <strong>Sign in to Porch</strong>
        <small>Ravenswood, Chicago</small>
        <p>Your session ended. Sign in again.</p>
        <span className="hub-porch-field">theo.park@fastmail.com</span>
        <span className="hub-porch-field">••••••••••••</span>
        <span className="hub-porch-button">Sign in</span>
      </div>
    </div>
  );
}

const PREVIEW: Record<ProductId, () => ReactElement> = {
  larder: LarderPreview,
  northlight: NorthlightPreview,
  porch: PorchPreview,
};

export function ProductShowcase() {
  const progress = useSyncExternalStore(subscribeProductProgress, loadProductProgress, productProgressServer);
  return (
    <ul className="hub-products">
      {PRODUCT_ORDER.map((id) => {
        const def = PRODUCTS[id];
        const Preview = PREVIEW[id];
        const next = def.incidents.find((item) => !progress[item.id]) ?? def.incidents[0];
        const resolved = def.incidents.filter((item) => progress[item.id]).length;
        return (
          <li key={id} className="hub-product">
            <Link href={`/sre-labs/${id}/${next.id}`} className="hub-preview-link" tabIndex={-1} aria-hidden="true">
              <Preview />
            </Link>
            <div className="hub-product-copy">
              <p className="hub-domain">
                {def.domain} · {def.kind}
              </p>
              <h3>{def.name}</h3>
              <p>{def.description}</p>
              <ol className="hub-incidents" aria-label={`${def.name} incidents`}>
                {def.incidents.map((item) => (
                  <li key={item.id}>
                    <Link href={`/sre-labs/${id}/${item.id}`}>
                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {item.kind} · {item.skills.join(", ")}
                        </small>
                      </span>
                      {progress[item.id] ? (
                        <span className="hub-resolved">
                          <CheckCircle2 size={14} aria-hidden="true" /> Resolved
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ol>
              <Link className="labs-button" href={`/sre-labs/${id}/${next.id}`}>
                {resolved === def.incidents.length ? `Open ${def.name} again` : resolved ? `Continue in ${def.name}` : `Open ${def.name}`}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
