import React from "react";
import { MobileRevenueLedgerView } from "../../../components/revenue/MobileRevenueLedgerView";
import { HRBottomNav } from "../../../components/hr/HRBottomNav";

export default function HRTotalRevenueScreen() {
  return (
    <MobileRevenueLedgerView
      role="HR"
      headerTitle="HR Total Revenue Analytics"
      bottomNav={<HRBottomNav activeTab="total-revenue" />}
    />
  );
}
