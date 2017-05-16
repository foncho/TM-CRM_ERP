/**
 2014-2016 ToManage

NOTICE OF LICENSE

This source file is subject to the Open Software License (OSL 3.0)
that is bundled with this package in the file LICENSE.txt.
It is also available through the world-wide-web at this URL:
http://opensource.org/licenses/osl-3.0.php
If you did not receive a copy of the license and are unable to
obtain it through the world-wide-web, please send an email
to license@tomanage.fr so we can send you a copy immediately.

DISCLAIMER

Do not edit or add to this file if you wish to upgrade ToManage to newer
versions in the future. If you wish to customize ToManage for your
needs please refer to http://www.tomanage.fr for more information.

@author    ToManage SAS <contact@tomanage.fr>
@copyright 2014-2016 ToManage SAS
@license   http://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
International Registered Trademark & Property of ToManage SAS
**/


"use strict";

/* global angular: true */
MetronicApp.controller('OfferController', ['$scope', '$rootScope', '$location', '$http', '$modal', '$filter', '$timeout', 'Offers',
    function($scope, $rootScope, $location, $http, $modal, $filter, $timeout, Offers) {

        $scope.backTo = 'offer.list';

        var grid = new Datatable();
        var user = $rootScope.login;

        $scope.offer = {
            entity: $rootScope.login.entity,
            billing: {},
            bl: [{}],
            lines: []
        };
        $scope.dict = {};
        var iconsFilesList = {};
        $scope.types = [{
            name: "En cours",
            id: "NOW"
        }, {
            name: "Clos",
            id: "CLOSED"
        }];
        $scope.type = {
            name: "En cours",
            id: "NOW"
        };

        $scope.delivery_mode = ["Comptoir", "Livraison"];

        $scope.open = function($event) {
            $event.preventDefault();
            $event.stopPropagation();

            $scope.opened = true;
        };

        $scope.$dict = {};

        // Init
        $scope.$on('$viewContentLoaded', function() {
            // initialize core components
            Metronic.initAjax();

            // set default layout mode
            $rootScope.settings.layout.pageSidebarClosed = true;
            $rootScope.settings.layout.pageBodySolid = false;

            var dict = ["fk_offer_status", "fk_paiement", "fk_input_reason", "fk_payment_term", "fk_tva"];
            $http({
                method: 'GET',
                url: '/erp/api/dict',
                params: {
                    dictName: dict
                }
            }).success(function(data, status) {
                $scope.dict = data;
                //console.log(data);
            });

            $http({
                method: 'GET',
                url: '/erp/api/employees/bySalesAccount'
            }).success(function(data, status) {
                $scope.$dict.salesPerson = data.data;
                //console.log(data);
            });

            $http({
                method: 'GET',
                url: '/erp/api/employees/getForDd',
                params: {
                    isEmployee: true
                }
            }).success(function(data, status) {
                $scope.$dict.employees = data.data;
                //console.log(data);
            });

            $http({
                method: 'GET',
                url: '/erp/api/product/taxes'
            }).success(function(data, status) {
                //console.log(data);
                $scope.taxes = data.data;
            });


            initDatatable();
        });

        $scope.showStatus = function(idx, dict) {
            if (!($scope.dict[dict] && $scope.offer[idx]))
                return;
            var selected = $filter('filter')($scope.dict[dict].values, {
                id: $scope.offer[idx]
            });
            return ($scope.offer[idx] && selected && selected.length) ? selected[0].label : 'Non défini';
        };

        $scope.create = function() {
            var offer = new Offers(this.offer);
            offer.$save(function(response) {
                $rootScope.$state.go("offer.show", { id: response._id });
            });
        };
        $scope.remove = function(offer) {
            offer.$remove();
            $rootScope.$state.go("offer.list");
        };
        $scope.update = function(callback) {
            var offer = $scope.offer;

            for (var i = offer.lines.length; i--;) {
                // actually delete lines
                if (offer.lines[i].isDeleted) {
                    offer.lines.splice(i, 1);
                }
            }
            offer.$update(function(response) {
                //$location.path('societe/' + societe._id);
                //pageTitle.setTitle('Commande client ' + offer.ref);

                /*if (response.lines) {
                    for (var i = 0; i < response.lines.length; i++) {
                        $scope.offer.lines[i].idLine = i;
                    }
                }
                if (response.Status == "DRAFT" || response.Status == "NEW" || response.Status == "QUOTES")
                    $scope.editable = true;
                else
                    $scope.editable = false;

                if (callback)
                    callback(null, response);*/

                $scope.findOne();
            });
        };
        $scope.clone = function() {
            $scope.offer.$clone(function(response) {
                $rootScope.$state.go('offer.show', {
                    id: response._id
                });
                //$location.path("offers/" + response._id);
            });
        };

        $scope.findOne = function() {
            Offers.get({
                Id: $rootScope.$stateParams.id
            }, function(offer) {
                $scope.offer = offer;
                console.log(offer);
                //on utilise idLine pour definir la ligne produit que nous voulons supprimer
                for (var i = 0; i < $scope.offer.lines.length; i++) {
                    $scope.offer.lines[i].idLine = i;
                }
                if (offer.Status == "DRAFT" || offer.Status == "NEW" || offer.Status == "QUOTES")
                    $scope.editable = true;
                else
                    $scope.editable = false;
                $http({
                    method: 'GET',
                    url: 'api/ticket',
                    params: {
                        find: {
                            "linked.id": offer._id
                        },
                        fields: "name ref updatedAt percentage Status task"
                    }
                }).success(function(data, status) {
                    if (status === 200)
                        $scope.tickets = data;
                    $scope.countTicket = $scope.tickets.length;
                });
                //pageTitle.setTitle('Commande client ' + $scope.offer.ref);
            }, function(err) {
                if (err.status === 401)
                    $location.path("401.html");
            });
        };

        $scope.sendEmail = function() {
            $http.post('/erp/api/sendEmail', {
                to: this.offer.contacts,
                data: {
                    title: 'Votre devis ' + this.offer.ref_client || "",
                    subtitle: this.offer.client.name + (this.offer.ref_client ? " - Reference " + this.offer.ref_client : ""),
                    message: 'Veuillez trouver ci-joint la proposition commerciale. Cliquer sur le bouton ci-apres pour le telecharger.',
                    url: '/erp/api/offer/download/' + this.offer._id,
                    entity: this.offer.entity
                },
                ModelEmail: 'email_PDF'
            }).then(function(res) {
                //console.log(res);
                if (res.status == 200) {

                    $scope.offer.history.push({
                        date: new Date(),
                        mode: 'email',
                        msg: 'email envoye',
                        Status: 'notify',
                        author: {
                            id: $rootScope.login._id,
                            name: $rootScope.login.name
                        }
                    });

                    return $scope.update();
                }
                //return res.data;
            });
        };

        /*$scope.userAutoComplete = function (val) {
            return $http.post('/erp/api/user/name/autocomplete', {
                take: '5',
                skip: '0',
                page: '1',
                pageSize: '5',
                filter: {
                    logic: 'and',
                    filters: [{
                            value: val
                        }]
                }
            }).then(function (res) {
                return res.data;
            });
        };*/

        $scope.updateAddress = function(data) {
            if (this.editableOffer)
                this.editableOffer.$save();
            // Only company name change
            if (typeof data !== 'object') {
                $scope.offer.billing.societe.name = data;
                $scope.offer.bl[0].name = data;
                return true;
            }

            console.log(data);

            $scope.offer.address = data.address;

            if (data.salesPurchases.isGeneric)
                $scope.offer.address.name = data.fullName;

            $scope.offer.cond_reglement_code = data.salesPurchases.cond_reglement;
            $scope.offer.mode_reglement_code = data.salesPurchases.mode_reglement;
            //$scope.offer.priceList = data.salesPurchases.priceList;
            $scope.offer.salesPerson = data.salesPurchases.salesPerson;
            $scope.offer.salesTeam = data.salesPurchases.salesTeam;


            // Billing address
            $scope.offer.billing = data.salesPurchases.cptBilling;

            $scope.offer.shippingAddress = data.shippingAddress[0];

            $scope.offer.addresses = data.shippingAddress;

            if (data.deliveryAddressId)
                for (var i = 0; i < data.shippingAddress.length; i++)
                    if (data.deliveryAddressId == data.shippingAddress[i]._id) {
                        $scope.offer.shippingAddress = data.shippingAddress[i];
                        break;
                    }
        };

        $scope.updateBillingAddress = function() {
            if ($scope.offer.billing.sameBL0) {
                $scope.offer.billing.name = $scope.offer.bl[0].name;
                $scope.offer.billing.address = $scope.offer.bl[0].address;
                $scope.offer.billing.zip = $scope.offer.bl[0].zip;
                $scope.offer.billing.town = $scope.offer.bl[0].town;
            }
            return true;
        };
        $scope.createOrder = function() {
            // CLOSE ORDER
            $scope.offer.Status = "SIGNED";
            $scope.update();
            $scope.offer.$order(function(response) {
                $rootScope.$state.go("order.show", { id: response._id });
            });
        };

        function initDatatable() {

            grid.init({
                src: $("#offerList"),
                onSuccess: function(grid) {
                    // execute some code after table records loaded
                },
                onError: function(grid) {
                    // execute some code on network or other general error 
                },
                loadingMessage: 'Loading...',
                dataTable: { // here you can define a typical datatable settings from http://datatables.net/usage/options 

                    // Uncomment below line("dom" parameter) to fix the dropdown overflow issue in the datatable cells. The default datatable layout
                    // setup uses scrollable div(table-scrollable) with overflow:auto to enable vertical scroll(see: assets/global/scripts/datatable.js). 
                    // So when dropdowns used the scrollable div should be removed. 
                    //"dom": "<'row'<'col-md-8 col-sm-12'pli><'col-md-4 col-sm-12'<'table-group-actions pull-right'>>r>t<'row'<'col-md-8 col-sm-12'pli><'col-md-4 col-sm-12'>>",

                    "bStateSave": true, // save datatable state(pagination, sort, etc) in cookie.

                    "ajax": {
                        "url": "/erp/api/offer/dt" // ajax source
                    },
                    "order": [
                        [1, "desc"]
                    ], // set first column as a default sort by asc
                    "columns": [{
                        data: 'bool'
                    }, {
                        "data": "ref"
                    }, {
                        "data": "supplier",
                        defaultContent: ""
                    }, {
                        "data": "ref_client",
                        defaultContent: ""
                    }, {
                        "data": "date_livraison",
                        defaultContent: ""
                    }, {
                        "data": "total_ht",
                        defaultContent: ""
                    }, {
                        "data": "Status"
                    }, {
                        "data": "entity",
                        defaultContent: ""
                    }, {
                        "data": "datec",
                        defaultContent: ""
                    }, {
                        data: 'action'
                    }]
                }
            });

            // handle group actionsubmit button click
            grid.getTableWrapper().on('click', '.table-group-action-submit', function(e) {
                e.preventDefault();
                var action = $(".table-group-action-input", grid.getTableWrapper());
                if (action.val() != "" && grid.getSelectedRowsCount() > 0) {
                    grid.setAjaxParam("customActionType", "group_action");
                    grid.setAjaxParam("customActionName", action.val());
                    grid.setAjaxParam("id", grid.getSelectedRows());
                    grid.getDataTable().ajax.reload();
                    grid.clearAjaxParams();
                } else if (action.val() == "") {
                    Metronic.alert({
                        type: 'danger',
                        icon: 'warning',
                        message: 'Please select an action',
                        container: grid.getTableWrapper(),
                        place: 'prepend'
                    });
                } else if (grid.getSelectedRowsCount() === 0) {
                    Metronic.alert({
                        type: 'danger',
                        icon: 'warning',
                        message: 'No record selected',
                        container: grid.getTableWrapper(),
                        place: 'prepend'
                    });
                }
            });
        }

        $scope.find = function() {
            grid.resetFilter();
        };


        $scope.changeStatus = function(Status) {
            $scope.offer.Status = Status;
            $scope.update();
        };

        $scope.checkLine = function(data) {
            //console.log(data);
            if (!data)
                return "La ligne produit ne peut pas être vide";
            if (!data._id)
                return "Le produit n'existe pas";
        };

        $scope.addProduct = function(data, index, lines) {
            console.log(data);
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].idLine === index) {
                    lines[i] = {
                        type: 'product',
                        pu_ht: data.prices.price,
                        total_taxes: data.taxes,
                        discount: data.discount,
                        priceSpecific: (data.dynForm ? true : false),
                        product: {
                            _id: data._id,
                            info: data.info,
                            taxes: data.taxes,
                            unit: data.units,
                            dynForm: data.dynForm
                                //family: data.product.id.caFamily
                        },
                        description: (lines[i].description ? lines[i].description : data.info.langs[0].description),
                        isNew: true,
                        qty: lines[i].qty,
                        //qty_order: lines[i].qty_order, // qty from order
                        //weight: data.info.weight,
                        idLine: index
                    };
                    //console.log(lines[i]);
                    $scope.calculMontantHT(lines[i]);
                }
            }
        };
        var round = function(value, decimals) {
            if (value > Math.pow(10, (decimals + 2) * -1) * -1 && value < Math.pow(10, (decimals + 2) * -1)) // Fix error little number
                return 0;
            return Number(Math.round(value + 'e' + (decimals)) + 'e-' + (decimals));
        };

        $scope.calculMontantHT = function(line, data, varname) {
            if (varname)
                line[varname] = data;

            function calculHT(line) {
                if (line.qty) {
                    line.total_ht = round(line.qty * (line.pu_ht * (1 - (line.discount / 100))), 2);
                    //line.total_tva = line.total_ht * line.tva_tx / 100;
                } else {
                    line.total_ht = 0;
                    //line.total_tva = 0;
                }
            }

            if (line.qty && line.product && line.product._id && !line.priceSpecific)
                return $http.post('/erp/api/product/price', {
                    priceList: $scope.offer.supplier.salesPurchases.priceList._id,
                    qty: line.qty,
                    _id: line.product._id
                }).then(function(res) {
                    //console.log(res.data);
                    line.pu_ht = res.data.pu_ht;
                    if (res.data.discount)
                        line.discount = res.data.discount;

                    //return res.data;
                    calculHT(line);
                });

            calculHT(line);
        };
        $scope.productAutoComplete = function(val) {
            return $http.post('/erp/api/product/autocomplete', {
                take: 50,
                skip: 0,
                page: 1,
                pageSize: 5,
                priceList: $scope.offer.supplier.salesPurchases.priceList._id,
                //                supplier: options.supplier,
                filter: {
                    logic: 'and',
                    filters: [{
                        value: val
                    }]
                }
            }).then(function(res) {
                console.log(res.data);
                return res.data;
            });
        };
        // filter lines to show
        $scope.filterLine = function(line) {
            return line.isDeleted !== true;
        };
        $scope.editLine = function(row, index, lines) {
            this.tableform.$save();
            var self = this;
            var modalInstance = $modal.open({
                templateUrl: '/templates/dynforms/productline.html',
                controller: "DynFormController",
                size: "lg",
                resolve: {
                    object: function() {
                        return row;
                    },
                    options: function() {
                        return {
                            price_level: $scope.offer.price_level
                        };
                    }
                }
            });
            modalInstance.result.then(function(line) {
                //angular.extend($scope.offer.lines[index], line);
                $scope.offer.lines[index] = line;
                $scope.calculMontantHT($scope.offer.lines[index]);
                self.tableform.$show();
            }, function() {});
        };
        // add line
        $scope.addLine = function(lines) {
            lines.push({
                isNew: true,
                idLine: lines.length
            });
        };
        // mark line as deleted
        $scope.deleteLine = function(line) {
            line.isDeleted = true;
        };
        // Duplicate a line
        $scope.copyLine = function(line, lines) {

            var new_line = _.clone(line);
            delete new_line._id;
            delete new_line.id;
            delete new_line['$$hashKey'];
            new_line.isNew = true;
            new_line.idLine = lines.length;

            lines.push(new_line);
        };

        $scope.AddSubTotal = function(index) {
            $scope.offer.lines.splice(index + 1, 0, {
                pu_ht: null,
                tva_tx: null,
                discount: null,
                type: 'SUBTOTAL',
                product: null,
                description: "",
                isNew: true,
                qty: null
            });

            for (var i in $scope.offer.lines) {
                $scope.offer.lines[i].idLine = i;
            }
        };


        // up or down a line
        $scope.upDownLine = function(id, mode, lines) {
            //id = parseInt(id);
            var elem = lines[id];
            if (mode == 'UP') {
                lines[id] = lines[id - 1];
                lines[id - 1] = elem;
            } else {
                lines[id] = lines[id + 1];
                lines[id + 1] = elem;
            }
            $scope.update();
        };
        /**
         * Get fileType for icon
         */
        $scope.getFileTypes = function() {
            $http({
                method: 'GET',
                url: 'dict/filesIcons'
            }).
            success(function(data, status) {
                if (status == 200) {
                    iconsFilesList = data;
                }
            });
        };


    }
]);