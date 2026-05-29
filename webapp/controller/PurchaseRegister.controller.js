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
    "sap/ui/core/format/DateFormat",
    "sap/m/Token"
], function (Controller, Filter, FilterOperator, MessageBox, DateFormat, Token) {
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

                    // Converts manually typed text into a standard Token with the 'x' remove icon
                    var aMultiInputIds = ["filterPr", "filterPrDate", "filterPo", "filterMaterial", "filterPlant", "filterGateEntry"];

                    aMultiInputIds.forEach(function (sId) {
                        var oMultiInput = that.byId(sId);
                        if (oMultiInput) {
                            oMultiInput.addValidator(function (args) {
                                var sText = args.text;

                                // Blur the table since the filter changed
                                that.onFilterChange();

                                // Creates the token looking exactly like standard Fiori (e.g., "=11111")
                                return new Token({
                                    key: sText,
                                    text: "=" + sText
                                });
                            });
                        }
                    });
                    // ============================
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
        /**
         * Validates manually typed dates in the DatePickers
         */
        onDateChange: function (oEvent) {
            var oDatePicker = oEvent.getSource();
            var bValid = oEvent.getParameter("valid"); // SAPUI5 natively checks if it matches displayFormat
            var sValue = oEvent.getParameter("value");

            if (sValue !== "" && !bValid) {
                // If the user typed something invalid (e.g. "32.13.2026" or "abc")
                oDatePicker.setValueState("Error");
                oDatePicker.setValueStateText("Invalid Date Format. Please use DD.MM.YYYY");
            } else {
                // Clear the error state if valid
                oDatePicker.setValueState("None");
                oDatePicker.setValueStateText("");
            }

            // Also trigger the table blur
            this.onFilterChange();
        },

        _validateSearchInputs: function () {
            var oDateFromInput = this.byId("filterPoDateFrom");
            var oDateToInput = this.byId("filterPoDateTo");

            // 1. Block the search if the DatePickers are currently in an Error state
            if (oDateFromInput.getValueState() === "Error" || oDateToInput.getValueState() === "Error") {
                MessageBox.error("Please fix the invalid date formats(DD.MM.YYYY) before searching.", { title: "Validation Error" });
                return false;
            }

            var sDateFrom = oDateFromInput.getValue();
            var sDateTo = oDateToInput.getValue();

            // 2. Dynamic check for empty fields
            if (!sDateFrom && !sDateTo) {
                // Both are empty
                MessageBox.error("Both 'From PO Date' and 'To PO Date' are mandatory parameters.", { title: "Missing Parameters" });
                return false;
            } else if (!sDateFrom) {
                // Only 'From PO Date' is empty
                MessageBox.error("'From PO Date' is a mandatory parameter.", { title: "Missing Parameter" });
                return false;
            } else if (!sDateTo) {
                // Only 'To PO Date' is empty
                MessageBox.error("'To PO Date' is a mandatory parameter.", { title: "Missing Parameter" });
                return false;
            }

            // 3. Logic validation (From Date cannot be after To Date)
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
                    var sManualText = oInput.getValue(); // Catch manually typed text that wasn't tokenized

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

                    // aTokens.forEach(function (oToken) {
                    //     var oRange = oToken.data("range");
                    //     if (oRange) {
                    //         aFilters.push(new Filter({
                    //             path: sFilterField,
                    //             operator: oRange.operation,
                    //             value1: formatVal(oRange.value1),
                    //             value2: formatVal(oRange.value2)
                    //         }));
                    //     } else {
                    //         aFilters.push(new Filter(sFilterField, FilterOperator.EQ, formatVal(oToken.getKey())));
                    //     }
                    // });
                    // 1. Process standard Tokens (from Value Help or pressing Enter)
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

                    // 2. Process lingering manual text as an "Equal To" filter
                    // This ensures typing "29.05.2026" in PR Date manually still works perfectly when they hit Go
                    if (sManualText) {
                        aFilters.push(new Filter(sFilterField, FilterOperator.EQ, formatVal(sManualText)));
                    }
                }
            };

            // Pass 'true' as the third parameter for Date fields so they are converted properly
            extractFilters("filterPr", "Pr", false);
            extractFilters("filterPrDate", "PurchaseReqnCreationDate", true); // <--- Flagged as Date
            extractFilters("filterPo", "Po", false);
            extractFilters("filterMaterial", "Material", false);
            extractFilters("filterPlant", "Plant", false);
            extractFilters("filterGateEntry", "YY1_GateEntryNumber_MMI", false);

            // 1. Turn ON the busy indicator before calling the backend
            oTable.setBusyIndicatorDelay(0); // Show spinner immediately without delay
            oTable.setBusy(true);

            oTable.bindRows({
                path: sBindPath,
                parameters: { $count: true },
                filters: aFilters,
                events: {
                    dataReceived: function (oDataEvent) {
                        // 2. Turn OFF the busy indicator when data/error arrives
                        oTable.setBusy(false);

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

                        // 3. No Data Validation Check
                        if (iCount === 0) {
                            MessageBox.information("No records found for the selected criteria.", {
                                title: "No Data Found",
                                styleClass: "sapUiSizeCompact"
                            });
                        }
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
                    // title: "Define Conditions: " + sTitle,
                    title: sTitle,
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

                // ====== ADD THIS NEW BLOCK HERE ======
                // If it is a string field, force "EQ" (equal to) to be the first/default operation, 
                // followed by the rest of the standard string operations.
                if (sFieldType === "string") {
                    oValueHelpDialog.setIncludeRangeOperations([
                        FilterOperator.EQ,
                        FilterOperator.Contains,
                        FilterOperator.BT,
                        FilterOperator.StartsWith,
                        FilterOperator.EndsWith,
                        FilterOperator.LT,
                        FilterOperator.LE,
                        FilterOperator.GT,
                        FilterOperator.GE
                    ], "string");
                }
                // =====================================

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