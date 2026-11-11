import React from "react";
import { MobileRevenueLedgerView } from "../../../components/revenue/MobileRevenueLedgerView";

export default function AdminTotalRevenueScreen() {
  return (
    <MobileRevenueLedgerView
      role="ADMIN"
      headerTitle="Admin Total Revenue Analytics"
    />
  );
}
