"use strict";

const subscriptions = require("./subscriptions");
const vendorSubscriptions = require("./vendorSubscriptions");

function overview(db, userId, now = new Date()) {
  const user = subscriptions.publicSubscription(db, userId);
  const vendor = db.prepare("SELECT id FROM vendors WHERE userId=?").get(userId);
  return {
    userSubscription: user,
    vendorSubscription: vendor ? vendorSubscriptions.getVendorState(db, vendor.id, now) : null,
    separation: {
      userScope: "NEXA account membership and service-fee benefits",
      vendorScope: "Dream Marketplace vendor operating access and vendor billing",
      independent: true,
    },
  };
}

module.exports = { overview };
