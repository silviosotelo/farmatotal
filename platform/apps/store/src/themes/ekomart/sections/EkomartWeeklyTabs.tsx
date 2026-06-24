"use client";

import React, { useState } from "react";
import type { Product } from "@/types";
import { EkomartProductCard } from "../EkomartProductCard";
import { Button } from "@platform/ui";

export interface WeeklyTab {
  label: string;
  products: Product[];
}

/**
 * Sección "Weekly Best Selling" con pestañas (markup verbatim del original),
 * cableada a nuestros productos agrupados por pestaña.
 */
export default function EkomartWeeklyTabs({
  title,
  tabs,
}: {
  title: string;
  tabs: WeeklyTab[];
}) {
  const [active, setActive] = useState(0);
  if (!tabs.length) return null;

  return (
    <div className="weekly-best-selling-area rts-section-gap bg_light-1">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="title-area-between">
              <h2 className="title-left">{title}</h2>
              <ul className="nav nav-tabs best-selling-grocery" id="myTab" role="tablist">
                {tabs.map((tab, idx) => (
                  <li className="nav-item" role="presentation" key={tab.label}>
                    <Button
                      type="button"
                      variant="plain"
                      onClick={() => setActive(idx)}
                      className={`nav-link ${active === idx ? "active" : ""}`}
                    >
                      {tab.label}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-lg-12">
            <div>
              <div className="row g-4">
                {tabs[active].products.map((product) => (
                  <div
                    key={product.id}
                    className="col-xxl-2 col-xl-3 col-lg-4 col-md-4 col-sm-6 col-12"
                  >
                    <EkomartProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
