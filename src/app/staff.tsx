import React from 'react';
import { View } from 'react-native';
import { StaffScreen, JoinStaffBox } from '../StaffScreen';
import { useStaff } from '../useStaff';
import { useVendorDashboard } from '../useMarketplace';
import { theme } from '../theme';
import { NexaWorldBackground } from '../NexaWorldBackground';

/**
 * Legacy staff deep link compatibility route.
 *
 * Unlike the historical route, ownership is never assumed. The actual vendor
 * relationship and staff role are resolved from the authenticated account.
 */
export default function Staff() {
  const vendorState = useVendorDashboard(true);
  const isVendorOwner = !!vendorState.vendor;
  const staff = useStaff({ isVendorOwner, active: true });
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <NexaWorldBackground world="staff">
        {isVendorOwner || staff.canManageStaff
          ? <StaffScreen staff={staff} isVendorOwner={isVendorOwner} shopName={vendorState.vendor?.shopName} />
          : <JoinStaffBox staff={staff} />}
      </NexaWorldBackground>
    </View>
  );
}
