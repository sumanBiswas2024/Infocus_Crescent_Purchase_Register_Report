// sap.ui.define([
//     "sap/ui/core/mvc/Controller"
// ], (Controller) => {
//     "use strict";

//     return Controller.extend("purchaseregisterreport.controller.PurchaseRegister", {
//         onInit() {
//         }
//     });
// });



sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox"
], function (Controller, Filter, FilterOperator, MessageBox) {
    "use strict";

    return Controller.extend("purchaseregisterreport.controller.PurchaseRegister", {

        onInit: function () {
            var that = this;

            // Wait for the view to render/initialize to safely grab the component model
            this.getView().attachEventOnce("modelContextChange", function () {
                var oModel = that.getView().getModel(); // Assuming main service is the default nameless model
                if (oModel) {
                    // Check for OData V4 Metadata load errors
                    oModel.getMetaModel().requestObject("/").catch(function (oError) {
                        MessageBox.error(
                            "Failed to load OData service metadata. Please check the backend connection or gateway logs.",
                            {
                                title: "Metadata Error",
                                details: oError.message || oError.toString(),
                                styleClass: "sapUiSizeCompact"
                            }
                        );
                    });
                }
            });
        },

        /**
         * Separate validation function for cleaner search logic
         * @returns {boolean} true if valid, false if invalid
         */
        _validateSearchInputs: function () {
            var oDateFromInput = this.byId("filterPoDateFrom");
            var oDateToInput = this.byId("filterPoDateTo");

            var sDateFrom = oDateFromInput.getValue();
            var sDateTo = oDateToInput.getValue();

            // 1. Check for empty values
            if (!sDateFrom || !sDateTo) {
                MessageBox.warning("Both 'From PO Date' and 'To PO Date' are mandatory parameters. Please provide valid dates.", {
                    title: "Missing Parameters"
                });
                return false;
            }

            // 2. Validate date logic (From Date should not be after To Date)
            var oDateFrom = oDateFromInput.getDateValue();
            var oDateTo = oDateToInput.getDateValue();

            if (oDateFrom && oDateTo && oDateFrom > oDateTo) {
                MessageBox.error("'From PO Date' cannot be after 'To PO Date'. Please correct the date range.", {
                    title: "Invalid Date Range"
                });
                return false;
            }

            return true;
        },

        onSearch: function (oEvent) {
            var oTable = this.byId("purchaseRegisterTable");
            var that = this;

            // Trigger extracted validation logic
            if (!this._validateSearchInputs()) {
                return; // Stop execution if validation fails
            }

            // Get validated string values for the OData path
            var sDateFrom = this.byId("filterPoDateFrom").getValue();
            var sDateTo = this.byId("filterPoDateTo").getValue();

            // Build the parameterized OData Path
            var sBindPath = "/ZC_PURCHASE_REG(P_PODateFrom=" + sDateFrom + ",P_PODateTo=" + sDateTo + ")/Set";

            // Gather filters from all MultiInputs
            var aFilters = [];
            var extractFilters = function (sControlId, sFilterField) {
                var oInput = that.byId(sControlId);
                if (oInput) {
                    var aTokens = oInput.getTokens();
                    aTokens.forEach(function (oToken) {
                        var oRange = oToken.data("range");
                        if (oRange) {
                            aFilters.push(new Filter({
                                path: sFilterField,
                                operator: oRange.operation,
                                value1: oRange.value1,
                                value2: oRange.value2
                            }));
                        } else {
                            aFilters.push(new Filter(sFilterField, FilterOperator.EQ, oToken.getKey()));
                        }
                    });
                }
            };

            // Apply extraction mapped to the property names in metadata
            extractFilters("filterPr", "Pr");
            extractFilters("filterPrDate", "PurchaseReqnCreationDate");
            extractFilters("filterPo", "Po");
            extractFilters("filterMaterial", "Material");
            extractFilters("filterPlant", "Plant");
            extractFilters("filterGateEntry", "YY1_GateEntryNumber_MMI");

            // Setup the UI Table binding with built-in error handling
            oTable.bindRows({
                path: sBindPath,
                parameters: {
                    $count: true
                },
                filters: aFilters,
                events: {
                    dataReceived: function (oDataEvent) {
                        // OData V4 table bindings pass an "error" parameter on failure
                        var oError = oDataEvent.getParameter("error");
                        if (oError) {
                            MessageBox.error("An error occurred while fetching the Purchase Register data.", {
                                title: "Data Retrieval Failed",
                                details: oError.message || oError.toString(),
                                styleClass: "sapUiSizeCompact"
                            });
                            that.byId("tableHeaderTitle").setText("Purchase Register (Error)");
                            return;
                        }

                        // Success scenario: update header count
                        var oBinding = oDataEvent.getSource();
                        var iCount = oBinding.getLength() || 0;
                        that.byId("tableHeaderTitle").setText("Purchase Register (" + iCount + ")");
                    }
                }
            });
        },

        onValueHelpRequest: function (oEvent) {
            var oMultiInput = oEvent.getSource();
            var sTitle = oMultiInput.getParent().getLabel();
            var sFieldType = oMultiInput.data("type") || "string";
            var that = this;

            sap.ui.require([
                "sap/ui/comp/valuehelpdialog/ValueHelpDialog",
                "sap/ui/model/type/String",
                "sap/ui/model/type/Date"
            ], function (ValueHelpDialog, TypeString, TypeDate) {

                var oValueHelpDialog = new ValueHelpDialog({
                    title: "Define Conditions: " + sTitle,
                    supportMultiselect: true,
                    supportRanges: true,
                    supportRangesOnly: true,
                    key: "ConditionKey",
                    descriptionKey: sTitle,

                    ok: function (oControlEvent) {
                        var aTokens = oControlEvent.getParameter("tokens");
                        oMultiInput.setTokens(aTokens);
                        oValueHelpDialog.close();
                    },
                    cancel: function () {
                        oValueHelpDialog.close();
                    },
                    afterClose: function () {
                        oValueHelpDialog.destroy();
                    }
                });

                var oTypeInstance;
                if (sFieldType === "date") {
                    oTypeInstance = new TypeDate({
                        pattern: "yyyy-MM-dd",
                        UTC: true
                    });
                } else {
                    oTypeInstance = new TypeString();
                }

                oValueHelpDialog.setRangeKeyFields([{
                    label: sTitle,
                    key: "ConditionKey",
                    type: sFieldType,
                    typeInstance: oTypeInstance
                }]);

                oValueHelpDialog.setTokens(oMultiInput.getTokens());

                that.getView().addDependent(oValueHelpDialog);
                oValueHelpDialog.open();
            });
        }
    });
});