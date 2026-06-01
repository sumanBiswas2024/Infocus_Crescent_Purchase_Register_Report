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
    "sap/ui/model/Sorter",
    "sap/m/MessageBox",
    "sap/ui/core/format/DateFormat",
    "sap/m/Token",
    "sap/ui/table/Column",
    "sap/ui/table/VisibleRowCountMode",
    "sap/m/Label",
    "sap/m/Text",
    "sap/ui/export/Spreadsheet",
    "sap/m/Dialog",
    "sap/m/List",
    "sap/m/StandardListItem",
    "sap/m/Button",
    "sap/m/CheckBox",
    "sap/m/Select",
    "sap/ui/core/Item",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Title",
    "sap/m/IconTabBar",
    "sap/m/IconTabFilter",
    "sap/m/SearchField",
    "sap/m/Toolbar",
    "sap/m/ToolbarSpacer"
], function (
    Controller,
    Filter,
    FilterOperator,
    Sorter,
    MessageBox,
    DateFormat,
    Token,
    Column,
    VisibleRowCountMode,
    Label,
    Text,
    Spreadsheet,
    Dialog,
    List,
    StandardListItem,
    Button,
    CheckBox,
    Select,
    Item,
    VBox,
    HBox,
    Title,
    IconTabBar,
    IconTabFilter,
    SearchField,
    Toolbar,
    ToolbarSpacer
) {
    "use strict";

    return Controller.extend("purchaseregisterreport.controller.PurchaseRegister", {

        onInit: function () {
            var that = this;

            this._createTableColumns();

            this.getView().attachEventOnce("modelContextChange", function () {
                var oModel = that.getView().getModel();

                if (oModel) {
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

                    ["filterPr", "filterPrDate", "filterPo", "filterMaterial", "filterPlant", "filterGateEntry"].forEach(function (sId) {
                        var oMultiInput = that.byId(sId);

                        if (oMultiInput) {
                            oMultiInput.addValidator(function (args) {
                                var sText = args.text;

                                that.onFilterChange();

                                return new Token({
                                    key: sText,
                                    text: "=" + sText
                                });
                            });
                        }
                    });
                }
            });
        },

        onFilterChange: function () {
            var oTable = this.byId("purchaseRegisterTable");

            if (oTable) {
                oTable.setShowOverlay(true);
            }
        },

        onDateChange: function (oEvent) {
            var oDatePicker = oEvent.getSource();
            var bValid = oEvent.getParameter("valid");
            var sValue = oEvent.getParameter("value");

            if (sValue !== "" && !bValid) {
                oDatePicker.setValueState("Error");
                oDatePicker.setValueStateText("Invalid Date Format. Please use DD.MM.YYYY");
            } else {
                oDatePicker.setValueState("None");
                oDatePicker.setValueStateText("");
            }

            this.onFilterChange();
        },

        onExportExcel: function () {
            var oTable = this.byId("purchaseRegisterTable");
            var aExportCols = this._aExportColumns.map(function (oCol) {
                return {
                    label: oCol.label,
                    property: oCol.property
                };
            });

            try {
                var oSpreadsheet = new Spreadsheet({
                    workbook: {
                        columns: aExportCols
                    },
                    dataSource: oTable.getBinding("rows"),
                    fileName: "Purchase_Register.xlsx"
                });

                oSpreadsheet.build().finally(function () {
                    oSpreadsheet.destroy();
                });
            } catch (e) {
                MessageBox.error("Unable to export the report.", {
                    title: "Export Failed",
                    details: e.message || e.toString(),
                    styleClass: "sapUiSizeCompact"
                });
            }
        },

        _validateSearchInputs: function () {
            var oDateFromInput = this.byId("filterPoDateFrom");
            var oDateToInput = this.byId("filterPoDateTo");
            var sDateFrom = oDateFromInput.getValue();
            var sDateTo = oDateToInput.getValue();
            var oDateFrom;
            var oDateTo;

            if (oDateFromInput.getValueState() === "Error" || oDateToInput.getValueState() === "Error") {
                MessageBox.error("Please fix the invalid date formats(DD.MM.YYYY) before searching.", {
                    title: "Validation Error"
                });
                return false;
            }

            if (!sDateFrom && !sDateTo) {
                MessageBox.error("Both 'From PO Date' and 'To PO Date' are mandatory parameters.", {
                    title: "Missing Parameters"
                });
                return false;
            }

            if (!sDateFrom) {
                MessageBox.error("'From PO Date' is a mandatory parameter.", {
                    title: "Missing Parameter"
                });
                return false;
            }

            if (!sDateTo) {
                MessageBox.error("'To PO Date' is a mandatory parameter.", {
                    title: "Missing Parameter"
                });
                return false;
            }

            oDateFrom = oDateFromInput.getDateValue();
            oDateTo = oDateToInput.getDateValue();

            if (oDateFrom && oDateTo && oDateFrom > oDateTo) {
                MessageBox.error("'From PO Date' cannot be after 'To PO Date'.", {
                    title: "Invalid Date Range"
                });
                return false;
            }

            return true;
        },

        _createTableColumns: function () {
            var oTable = this.byId("purchaseRegisterTable");
            var aColumns = [
                { label: "Purchase Requisition No.", property: "Pr" },
                { label: "Purchase Requisition Item No.", property: "Pritm" },
                { label: "PR Plant", property: "Prplant" },
                { label: "PR Plant Name", property: "Prplantname" },
                { label: "PR Date", property: "PurchaseReqnCreationDate" },
                { label: "PR Release Date", property: "Prreldt" },
                { label: "PR Qty", property: "RequestedQuantity" },
                { label: "PR Item Text", property: "Prtext" },
                { label: "PO No.", property: "Po" },
                { label: "PO Item No.", property: "Poitm" },
                { label: "Material Code", property: "Material" },
                { label: "PO Plant", property: "Plant" },
                { label: "PO Plant Name", property: "PlantName" },
                { label: "Material Description", property: "PurchaseOrderItemText" },
                { label: "PO Item Text", property: "Potext" },
                { label: "Vendor Code", property: "Supplier" },
                { label: "Vendor Name", property: "SupplierFullName" },
                { label: "PO Date", property: "PurchaseOrderDate" },
                { label: "PO Release Date", property: "Poreldate" },
                { label: "PO Qty", property: "OrderQuantity" },
                { label: "UOM", property: "UnitOfMeasure" },
                { label: "UOM Description", property: "UnitOfMeasureLongName" },
                { label: "GRN No.", property: "Grn" },
                { label: "GRN Year", property: "Grnyr" },
                { label: "GRN Item", property: "Grnitm" },
                { label: "GRN Date", property: "PostingDate" },
                { label: "GRN Qty", property: "QuantityInEntryUnit" },
                { label: "GRN Amount", property: "PurOrdAmountInCompanyCodeCrcy1" },
                { label: "Gate Entry No.", property: "YY1_GateEntryNumber_MMI" },
                { label: "Gate Entry Date", property: "gateentrydate" },
                { label: "Gate Entry Qty", property: "YY1_ChallanQuantity_MMI" },
                { label: "QC Status", property: "Qcsta" },
                { label: "By Hand", property: "byhand" },
                { label: "Vehicle No.", property: "YY1_VehicleNumber_MMI" },
                { label: "Transporter Name", property: "transportername" },
                { label: "Driver Name", property: "drivername" },
                { label: "Tare Weight", property: "YY1_TareWeight_MMI" },
                { label: "Unit Weight", property: "unitwt" },
                { label: "Gross Weight", property: "YY1_GrossWeight_MMI" },
                { label: "Net Weight", property: "YY1_NetWeight_MMI" },
                { label: "Check-In Date", property: "chkindt" },
                { label: "Check-In Time", property: "chkintm" },
                { label: "Check-Out Date", property: "chkoutdt" },
                { label: "Check-Out Time", property: "chkouttm" },
                { label: "GL Account", property: "GLAccount" },
                { label: "GL Description", property: "GLAccountLongName" },
                { label: "WBS No.", property: "wbs" },
                { label: "WBS Description", property: "wbsdesc" },
                { label: "Invoice Posting Number", property: "supinv" },
                { label: "Condition Type", property: "condtype" },
                { label: "Invoice Posting Date", property: "invpostdt" },
                { label: "Vendor Invoice No.", property: "SupplierInvoiceIDByInvcgParty" },
                { label: "Vendor Invoice Date", property: "DocumentDate" },
                { label: "Tax Code", property: "TaxCode" },
                { label: "IGST", property: "igst" },
                { label: "CGST", property: "cgst" },
                { label: "SGST", property: "sgst" },
                { label: "GST Amount", property: "gst" },
                { label: "Invoice Amount", property: "PurOrdAmountInCompanyCodeCrcy" },
                { label: "Payment Terms", property: "PaymentTerms" },
                { label: "Payment Due Date", property: "DueCalculationBaseDate" }
            ];

            this._aExportColumns = aColumns;
            this._configureTableScrolling(oTable);
            oTable.destroyColumns();

            aColumns.forEach(function (oCol) {
                oTable.addColumn(new Column({
                    width: "12rem",
                    sortProperty: oCol.property,
                    filterProperty: oCol.property,
                    showSortMenuEntry: true,
                    showFilterMenuEntry: true,
                    label: new Label({
                        text: oCol.label
                    }),
                    template: new Text({
                        text: "{" + oCol.property + "}"
                    })
                }).data("columnKey", oCol.property));
            });
        },

        _configureTableScrolling: function (oTable) {
            oTable.setThreshold(100);
            // oTable.setVisibleRowCountMode(VisibleRowCountMode.Fixed);
            // oTable.setVisibleRowCount(7);
            // oTable.setMinAutoRowCount(7);
            // oTable.setRowHeight(34);
            // oTable.setColumnHeaderHeight(42);
            oTable.setNoData("Use the filters and press Go to load purchase register data.");
        },

        onSearch: function () {
            var oTable = this.byId("purchaseRegisterTable");
            var that = this;
            var sDateFrom;
            var sDateTo;
            var sBindPath;
            var aFilters = [];
            var extractFilters;

            if (!this._validateSearchInputs()) {
                return;
            }

            oTable.setShowOverlay(false);

            sDateFrom = this.byId("filterPoDateFrom").getValue();
            sDateTo = this.byId("filterPoDateTo").getValue();
            sBindPath = "/ZC_PURCHASE_REG(P_PODateFrom=" + sDateFrom + ",P_PODateTo=" + sDateTo + ")/Set";

            extractFilters = function (sControlId, sFilterField, bIsDateField) {
                var oInput = that.byId(sControlId);
                var aTokens;
                var sManualText;
                var formatVal;

                if (!oInput) {
                    return;
                }

                aTokens = oInput.getTokens();
                sManualText = oInput.getValue();

                formatVal = function (v) {
                    var d;

                    if (bIsDateField && v) {
                        if (v instanceof Date) {
                            return DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(v);
                        }

                        d = DateFormat.getDateInstance({ pattern: "dd.MM.yyyy" }).parse(v);
                        if (d) {
                            return DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(d);
                        }
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

                if (sManualText) {
                    aFilters.push(new Filter(sFilterField, FilterOperator.EQ, formatVal(sManualText)));
                }
            };

            extractFilters("filterPr", "Pr", false);
            extractFilters("filterPrDate", "PurchaseReqnCreationDate", true);
            extractFilters("filterPo", "Po", false);
            extractFilters("filterMaterial", "Material", false);
            extractFilters("filterPlant", "Plant", false);
            extractFilters("filterGateEntry", "YY1_GateEntryNumber_MMI", false);

            oTable.setBusyIndicatorDelay(0);
            oTable.setBusy(true);

            oTable.bindRows({
                path: sBindPath,
                parameters: {
                    $count: true
                },
                filters: aFilters,
                events: {
                    dataReceived: function (oDataEvent) {
                        var oError = oDataEvent.getParameter("error");
                        var oBinding;
                        var iCount;

                        oTable.setBusy(false);

                        if (oError) {
                            MessageBox.error("An error occurred while fetching the data.", {
                                title: "Data Retrieval Failed",
                                details: oError.message || oError.toString(),
                                styleClass: "sapUiSizeCompact"
                            });
                            that.byId("tableHeaderTitle").setText("Purchase Register (Error)");
                            return;
                        }

                        oBinding = oDataEvent.getSource();
                        iCount = oBinding.getLength() || 0;

                        that.byId("tableHeaderTitle").setText("Purchase Register (" + iCount + ")");
                        that.byId("loadedRowsText").setText("Loaded: " + iCount);

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

        onTableSettings: function () {
            if (!this._oSettingsDialog) {
                this._createSettingsDialog();
            }

            this._syncSettingsDialog();
            this._oSettingsDialog.open();
        },

        _createSettingsDialog: function () {
            var that = this;

            this._oColumnSearchField = new SearchField({
                width: "100%",
                placeholder: "Search columns",
                liveChange: function (oEvent) {
                    that._filterSettingsLists(oEvent.getParameter("newValue"));
                }
            }).addStyleClass("sapUiSmallMarginBottom");

            this._oColumnVisibilityList = new List({
                mode: "MultiSelect",
                includeItemInSelection: true,
                growing: true,
                growingThreshold: 20
            });

            this._oColumnOrderList = new List({
                mode: "SingleSelectMaster",
                includeItemInSelection: true,
                growing: true,
                growingThreshold: 20
            });

            this._oSortSelect = new Select({
                width: "100%",
                items: this._aExportColumns.map(function (oCol) {
                    return new Item({
                        key: oCol.property,
                        text: oCol.label
                    });
                })
            });

            this._oSortDirectionSelect = new Select({
                width: "100%",
                items: [
                    new Item({ key: "asc", text: "Ascending" }),
                    new Item({ key: "desc", text: "Descending" })
                ]
            });

            this._oSettingsDialog = new Dialog({
                title: "Table Settings",
                contentWidth: "600px",
                contentHeight: "560px",
                verticalScrolling: true,
                content: [
                    new IconTabBar({
                        expandable: false,
                        headerBackgroundDesign: "Transparent",
                        items: [
                            new IconTabFilter({
                                text: "Columns",
                                icon: "sap-icon://table-column",
                                content: [
                                    new VBox({
                                        renderType: "Bare",
                                        items: [
                                            new Title({ text: "Show or hide columns", level: "H4" }).addStyleClass("sapUiSmallMarginBottom"),
                                            this._oColumnSearchField,
                                            new Toolbar({
                                                design: "Transparent",
                                                content: [
                                                    new ToolbarSpacer(),
                                                    new Button({
                                                        text: "Show All",
                                                        icon: "sap-icon://show",
                                                        press: function () {
                                                            that._setAllColumnSelections(true);
                                                        }
                                                    }),
                                                    new Button({
                                                        text: "Hide All",
                                                        icon: "sap-icon://hide",
                                                        press: function () {
                                                            that._setAllColumnSelections(false);
                                                        }
                                                    })
                                                ]
                                            }),
                                            this._oColumnVisibilityList
                                        ]
                                    }).addStyleClass("sapUiSmallMargin")
                                ]
                            }),
                            new IconTabFilter({
                                text: "Order",
                                icon: "sap-icon://sort",
                                content: [
                                    new VBox({
                                        renderType: "Bare",
                                        items: [
                                            new Title({ text: "Arrange visible table columns", level: "H4" }),
                                            new Toolbar({
                                                design: "Transparent",
                                                content: [
                                                    new ToolbarSpacer(),
                                                    new Button({
                                                        icon: "sap-icon://navigation-up-arrow",
                                                        tooltip: "Move selected column up",
                                                        press: function () {
                                                            that._moveSelectedColumn(-1);
                                                        }
                                                    }),
                                                    new Button({
                                                        icon: "sap-icon://navigation-down-arrow",
                                                        tooltip: "Move selected column down",
                                                        press: function () {
                                                            that._moveSelectedColumn(1);
                                                        }
                                                    })
                                                ]
                                            }),
                                            this._oColumnOrderList
                                        ]
                                    }).addStyleClass("sapUiSmallMargin")
                                ]
                            }),
                            new IconTabFilter({
                                text: "Sorting",
                                icon: "sap-icon://sort-ascending",
                                content: [
                                    new VBox({
                                        renderType: "Bare",
                                        items: [
                                            new Title({ text: "Default sort for the report", level: "H4" }).addStyleClass("sapUiSmallMarginBottom"),
                                            new Label({ text: "Column" }),
                                            this._oSortSelect,
                                            new Label({ text: "Direction" }).addStyleClass("sapUiSmallMarginTop"),
                                            this._oSortDirectionSelect
                                        ]
                                    }).addStyleClass("sapUiSmallMargin")
                                ]
                            })
                        ]
                    })
                ],
                beginButton: new Button({
                    text: "Apply",
                    type: "Emphasized",
                    press: function () {
                        that._applySettings();
                        that._oSettingsDialog.close();
                    }
                }),
                endButton: new Button({
                    text: "Cancel",
                    press: function () {
                        that._oSettingsDialog.close();
                    }
                })
            });

            this.getView().addDependent(this._oSettingsDialog);
        },

        _syncSettingsDialog: function () {
            var oTable = this.byId("purchaseRegisterTable");
            var aColumns = oTable.getColumns();

            this._oColumnVisibilityList.destroyItems();
            this._oColumnOrderList.destroyItems();
            this._oColumnSearchField.setValue("");

            aColumns.forEach(function (oColumn) {
                var sKey = oColumn.data("columnKey");
                var sText = oColumn.getLabel().getText();

                this._oColumnVisibilityList.addItem(new StandardListItem({
                    title: sText,
                    selected: oColumn.getVisible()
                }).data("columnKey", sKey));

                this._oColumnOrderList.addItem(new StandardListItem({
                    title: sText,
                    type: "Active"
                }).data("columnKey", sKey));
            }, this);
        },

        _filterSettingsLists: function (sQuery) {
            var sNormalizedQuery = (sQuery || "").toLowerCase();

            [this._oColumnVisibilityList, this._oColumnOrderList].forEach(function (oList) {
                oList.getItems().forEach(function (oItem) {
                    oItem.setVisible(oItem.getTitle().toLowerCase().indexOf(sNormalizedQuery) !== -1);
                });
            });
        },

        _setAllColumnSelections: function (bSelected) {
            this._oColumnVisibilityList.getItems().forEach(function (oItem) {
                oItem.setSelected(bSelected);
            });
        },

        _moveSelectedColumn: function (iDirection) {
            var oSelectedItem = this._oColumnOrderList.getSelectedItem();
            var iCurrentIndex;
            var iNewIndex;

            if (!oSelectedItem) {
                MessageBox.information("Please select a column to move.", {
                    title: "Column Order"
                });
                return;
            }

            iCurrentIndex = this._oColumnOrderList.indexOfItem(oSelectedItem);
            iNewIndex = iCurrentIndex + iDirection;

            if (iNewIndex < 0 || iNewIndex >= this._oColumnOrderList.getItems().length) {
                return;
            }

            this._oColumnOrderList.removeItem(oSelectedItem);
            this._oColumnOrderList.insertItem(oSelectedItem, iNewIndex);
            this._oColumnOrderList.setSelectedItem(oSelectedItem);
        },

        _applySettings: function () {
            var oTable = this.byId("purchaseRegisterTable");
            var mColumnsByKey = {};
            var sSortKey = this._oSortSelect.getSelectedKey();
            var bDescending = this._oSortDirectionSelect.getSelectedKey() === "desc";
            var oBinding;

            oTable.getColumns().forEach(function (oColumn) {
                mColumnsByKey[oColumn.data("columnKey")] = oColumn;
            });

            this._oColumnVisibilityList.getItems().forEach(function (oItem) {
                var oColumn = mColumnsByKey[oItem.data("columnKey")];

                if (oColumn) {
                    oColumn.setVisible(oItem.getSelected());
                }
            });

            this._oColumnOrderList.getItems().forEach(function (oItem, iIndex) {
                var oColumn = mColumnsByKey[oItem.data("columnKey")];

                if (oColumn) {
                    oTable.removeColumn(oColumn);
                    oTable.insertColumn(oColumn, iIndex);
                }
            });

            oBinding = oTable.getBinding("rows");
            if (oBinding && sSortKey) {
                oBinding.sort(new Sorter(sSortKey, bDescending));
            }
        },

        onClear: function () {
            var that = this;
            var oDateFrom = this.byId("filterPoDateFrom");
            var oDateTo = this.byId("filterPoDateTo");
            var oTable;

            if (oDateFrom) {
                oDateFrom.setValue(null);
            }

            if (oDateTo) {
                oDateTo.setValue(null);
            }

            ["filterPr", "filterPrDate", "filterPo", "filterMaterial", "filterPlant", "filterGateEntry"].forEach(function (sId) {
                var oMultiInput = that.byId(sId);

                if (oMultiInput) {
                    oMultiInput.setValue("");
                    oMultiInput.setTokens([]);
                }
            });

            oTable = this.byId("purchaseRegisterTable");
            if (oTable) {
                oTable.setShowOverlay(true);
            }
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
                    title: sTitle,
                    supportMultiselect: true,
                    supportRanges: true,
                    supportRangesOnly: true,
                    key: "ConditionKey",
                    descriptionKey: sTitle,
                    ok: function (oControlEvent) {
                        oMultiInput.setTokens(oControlEvent.getParameter("tokens"));
                        oValueHelpDialog.close();
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

                if (sFieldType === "date") {
                    oTypeInstance = new TypeDate({
                        pattern: "dd.MM.yyyy"
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