/*global QUnit*/

sap.ui.define([
	"purchaseregisterreport/controller/PurchaseRegister.controller"
], function (Controller) {
	"use strict";

	QUnit.module("PurchaseRegister Controller");

	QUnit.test("I should test the PurchaseRegister controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
