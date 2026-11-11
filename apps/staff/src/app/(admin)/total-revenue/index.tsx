import React from "react";
import { MobileRevenueLedgerView } from "../../../components/revenue/MobileRevenueLedgerView";
import { AdminBottomNav } from "../../../components/admin/AdminBottomNav";

export default function AdminTotalRevenueScreen() {
  return (
    <MobileRevenueLedgerView
      role="ADMIN"
      headerTitle="Admin Total Revenue Analytics"
      bottomNav={<AdminBottomNav activeTab="total-revenue" />}
    />
  );
}
