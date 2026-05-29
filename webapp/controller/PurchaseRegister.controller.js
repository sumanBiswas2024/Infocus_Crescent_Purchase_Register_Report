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
    "sap/m/MessageBox",
    "sap/ui/core/format/DateFormat"
], function (Controller, Filter, FilterOperator, MessageBox, DateFormat) {
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
          * Fired whenever ANY input field in the FilterBar is changed by the user.
          * Sets the table to a "dirty" blurred state (Standard Fiori behavior).
          */
        onFilterChange: function () {
            var oTable = this.byId("purchaseRegisterTable");
            if (oTable) {
                oTable.setShowOverlay(true);
            }
        },

        _validateSearchInputs: function () {
            var oDateFromInput = this.byId("filterPoDateFrom");
            var oDateToInput = this.byId("filterPoDateTo");
            var sDateFrom = oDateFromInput.getValue();
            var sDateTo = oDateToInput.getValue();

            if (!sDateFrom || !sDateTo) {
                MessageBox.error("'From PO Date' and 'To PO Date' are mandatory parameters.", { title: "Missing Parameters" });
                return false;
            }

            var oDateFrom = oDateFromInput.getDateValue();
            var oDateTo = oDateToInput.getDateValue();

            if (oDateFrom && oDateTo && oDateFrom > oDateTo) {
                MessageBox.error("'From PO Date' cannot be after 'To PO Date'.", { title: "Invalid Date Range" });
                return false;
            }

            return true;
        },

        onSearch: function (oEvent) {
            var oTable = this.byId("purchaseRegisterTable");
            var that = this;

            if (!this._validateSearchInputs()) {
                return;
            }

            // Remove the blur from the table because the user clicked Go
            oTable.setShowOverlay(false);

            var sDateFrom = this.byId("filterPoDateFrom").getValue();
            var sDateTo = this.byId("filterPoDateTo").getValue();
            var sBindPath = "/ZC_PURCHASE_REG(P_PODateFrom=" + sDateFrom + ",P_PODateTo=" + sDateTo + ")/Set";

            var aFilters = [];

            // Updated extractor to handle UI Date formats (dd.MM.yyyy) -> Backend formats (yyyy-MM-dd)
            var extractFilters = function (sControlId, sFilterField, isDateField) {
                var oInput = that.byId(sControlId);
                if (oInput) {
                    var aTokens = oInput.getTokens();

                    var formatVal = function (v) {
                        if (isDateField && v) {
                            if (v instanceof Date) {
                                return DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(v);
                            }
                            // If it's a string token like "29.05.2026", parse it and convert it
                            var d = DateFormat.getDateInstance({ pattern: "dd.MM.yyyy" }).parse(v);
                            if (d) return DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(d);
                        }
                        return v;
                    };

                    aTokens.forEach(function (oToken) {
                        var oRange = oToken.data("range");
                        if (oRange) {
                            aFilters.push(new Filter({
                                path: sFilterField,
                                operator: oRange.operation,
                                value1: formatVal(oRange.value1),
                                value2: formatVal(oRange.value2)
                            }));
                        } else {
                            aFilters.push(new Filter(sFilterField, FilterOperator.EQ, formatVal(oToken.getKey())));
                        }
                    });
                }
            };

            // Pass 'true' as the third parameter for Date fields so they are converted properly
            extractFilters("filterPr", "Pr", false);
            extractFilters("filterPrDate", "PurchaseReqnCreationDate", true); // <--- Flagged as Date
            extractFilters("filterPo", "Po", false);
            extractFilters("filterMaterial", "Material", false);
            extractFilters("filterPlant", "Plant", false);
            extractFilters("filterGateEntry", "YY1_GateEntryNumber_MMI", false);

            oTable.bindRows({
                path: sBindPath,
                parameters: { $count: true },
                filters: aFilters,
                events: {
                    dataReceived: function (oDataEvent) {
                        var oError = oDataEvent.getParameter("error");
                        if (oError) {
                            MessageBox.error("An error occurred while fetching the data.", {
                                title: "Data Retrieval Failed",
                                details: oError.message || oError.toString(),
                                styleClass: "sapUiSizeCompact"
                            });
                            that.byId("tableHeaderTitle").setText("Purchase Register (Error)");
                            return;
                        }
                        var oBinding = oDataEvent.getSource();
                        var iCount = oBinding.getLength() || 0;
                        that.byId("tableHeaderTitle").setText("Purchase Register (" + iCount + ")");
                    }
                }
            });
        },

        onClear: function (oEvent) {
            var that = this;

            var oDateFrom = this.byId("filterPoDateFrom");
            var oDateTo = this.byId("filterPoDateTo");
            if (oDateFrom) oDateFrom.setValue(null);
            if (oDateTo) oDateTo.setValue(null);

            var aMultiInputIds = ["filterPr", "filterPrDate", "filterPo", "filterMaterial", "filterPlant", "filterGateEntry"];
            aMultiInputIds.forEach(function (sId) {
                var oMultiInput = that.byId(sId);
                if (oMultiInput) {
                    oMultiInput.setValue("");
                    oMultiInput.setTokens([]);
                }
            });

            // Blur table on clear as well, prompting user to click Go
            var oTable = this.byId("purchaseRegisterTable");
            if (oTable) oTable.setShowOverlay(true);
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

                        // Fire the filter change overlay manually for value helps
                        that.onFilterChange();
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
                        pattern: "dd.MM.yyyy" // Changed from yyyy-MM-dd to the UI standard
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