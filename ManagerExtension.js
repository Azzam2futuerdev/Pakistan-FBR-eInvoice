//
//if you are encountering a net::ERR_CERT_AUTHORITY_INVALID error due to a self-signed or untrusted SSL certificate, 
//one possible solution is to install the certificate in your browser or operating system’s trusted root certificate authorities. 
//This process will allow your browser to recognize and trust the certificate, preventing the error.
//

const bposid = "1";
const token = "906b1cd8-0d10-3a91-8234-8ec88e376bd7";
const apiPathgetInvoice = 'https://esp.fbr.gov.pk:8244/DigitalInvoicing/v1/GetInvoiceDetails';
const apiPathsendInvoice = 'https://esp.fbr.gov.pk:8244/DigitalInvoicing/v1/PostInvoiceData_v1';


const hsCodeFieldGuid = "712b4944-2d0c-430c-b588-ad022b523cfd";
const ntnFieldGuid = "fe865ce6-f2d3-4e6e-9be0-9375bda56ea2";
const provinceFieldGuid = "61ea7429-10bc-467b-8177-f62e8f23775f";

const invoiceSaleTypeFieldGuid = "ac949b81-9b94-4b74-9a40-285e8dc29d39";
const reasonFieldGuid = "db51ce08-b377-42ae-9564-d0f5aca8857c";
const reasonRemarkFieldGuid = "41911d36-a9e6-4fd4-8d1b-1daa2964011d";

const uoMFieldGuid = "52862056-2c91-4899-b0d9-f81cdb260c84";
const retailPriceFieldGuid = "1b4f6cec-7fde-43b1-aad3-3c61630dad20";
const itemSaleTypeFieldGuid = "80513e2e-70fb-4ccf-b0c0-5379547bb58d";
const eInvoiceStatusFieldGuid = "5400ed3d-f6e3-46e8-8e2e-ad3de55b54c4";

const distributorNTNCNICFieldGuid = "fe865ce6-f2d3-4e6e-9be0-9375bda56ea2";
const distributorNameFieldGuid = "61ea7429-10bc-467b-8177-f62e8f23775f";

const currentUrl = window.location.href;

let jsonRequest = null;
let businessDetail = null;
let invoiceDetail = null;

function loadResource(url, type) {
    return new Promise((resolve, reject) => {
        let element;
        if (type === 'css') {
            element = document.createElement('link');
            element.href = url;
            element.rel = 'stylesheet';
        } else if (type === 'js') {
            element = document.createElement('script');
            element.src = url;
        }
        element.onload = () => resolve();
        element.onerror = () => reject();
        document.head.appendChild(element);
    });
}

async function GetBusinessDetail() {
    const anchorElement = document.getElementById('tabSettings');
    const hrefAttributeValue = anchorElement.getAttribute('href');
    const CompanyID = hrefAttributeValue.split('?')[1];
    const url = "/business-details-form?" + CompanyID;
    console.log(url);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Error fetching data: ' + response.statusText);
        }
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const scriptElements = doc.querySelectorAll('#nonBatchView script');
        let jsonData = null;
        scriptElements.forEach(scriptElement => {
            const scriptContent = scriptElement.textContent.trim();
            if (scriptContent.includes('app = new Vue')) {
                const dataMatch = scriptContent.match(/data:\s*(\{[\s\S]*?\})\s*,\s*methods:/);
                if (dataMatch) {
                    jsonData = JSON.parse(dataMatch[1]);
                }
            }
        });
        return jsonData;
    } catch (error) {
        console.error(error);
        return null;
    }
}

function GetInvoiceDetail(scriptContent) {
    const baseCurrencyMatch = scriptContent.match(/const baseCurrency = (\{.*?\});/s);
    const foreignCurrenciesMatch = scriptContent.match(/const foreignCurrencies = (\{.*?\});/s);
    const decimalSeparatorMatch = scriptContent.match(/const decimalSeparator = '([^']+)';/);
    const dataMatch = scriptContent.match(/data:\s*(\{[\s\S]*?\})\s*,\s*methods:/);

    const baseCurrency = baseCurrencyMatch ? JSON.parse(baseCurrencyMatch[1]) : null;
    const foreignCurrencies = foreignCurrenciesMatch ? JSON.parse(foreignCurrenciesMatch[1]) : null;
    const decimalSeparator = decimalSeparatorMatch ? decimalSeparatorMatch[1] : null;
    const invoiceData = dataMatch ? JSON.parse(dataMatch[1]) : null;

    let invoiceType = 0;
    let PartyName = '';
    let PartyNTNCNIC = '';
    let PartyProvince = '';

    const getFieldValue = (obj, field) => obj?.CustomFields2?.Strings?.[field] || '';

    if (currentUrl.includes('/purchase-invoice-form?')) {
        invoiceType = 1;
    } else if (currentUrl.includes('/sales-invoice-form?')) {
        invoiceType = 2;
    } else if (currentUrl.includes('/debit-note-form?')) {
        invoiceType = 3;
    } else if (currentUrl.includes('/credit-note-form?')) {
        invoiceType = 4;
    }

    if (currentUrl.includes('/debit-note-form?') || currentUrl.includes('/purchase-invoice-form?')) {
        PartyName = app.Supplier?.Name || '';
        PartyNTNCNIC = getFieldValue(app.Supplier, ntnFieldGuid);
        PartyProvince = getFieldValue(app.Supplier, provinceFieldGuid);
    } else {
        PartyName = app.Customer?.Name || '';
        PartyNTNCNIC = getFieldValue(app.Customer, ntnFieldGuid);
        PartyProvince = getFieldValue(app.Customer, provinceFieldGuid);
    }

    return {
        baseCurrency,
        foreignCurrencies,
        decimalSeparator,
        PartyName,
        PartyNTNCNIC,
        PartyProvince,
        invoiceType,
        invoiceData
    };
}

function getJsonRequest() {
    if (!businessDetail || !invoiceDetail) {
        return null;
    }
    const invoiceType = invoiceDetail.invoiceType;
    const invoiceDate = new Date(invoiceDetail.invoiceData.IssueDate).toISOString();

    let sellerNTNCNIC = '';
    let sellerBussinessName = '';
    let sellerProvince = '';
    let buyerNTNCNIC = '';
    let buyerBussinessName = '';
    let buyerProvince = '';
    let bussinessDestinationAddress = '';
    let distributorNTNCNIC = '';
    let distributorName = '';

    const getFieldValue = (obj, field) => obj?.CustomFields2?.Strings?.[field] || '';

    if (invoiceType == 1 || invoiceType == 3) {   //purchase invoice or debit note
        sellerNTNCNIC = invoiceDetail.PartyNTNCNIC;
        sellerBussinessName = invoiceDetail.PartyName;
        sellerProvince = invoiceDetail.PartyProvince;

        //distributorNTNCNIC = invoiceDetail.PartyNTNCNIC;
        //distributorName = invoiceDetail.PartyName;

        buyerNTNCNIC = getFieldValue(businessDetail, ntnFieldGuid);
        buyerBussinessName = businessDetail.Name;
        buyerProvince = getFieldValue(businessDetail, provinceFieldGuid);
        bussinessDestinationAddress = businessDetail.Address;
    } else {
        sellerNTNCNIC = getFieldValue(businessDetail, ntnFieldGuid);
        sellerBussinessName = businessDetail.Name;
        sellerProvince = getFieldValue(businessDetail, provinceFieldGuid);

        //distributorNTNCNIC = businessDetail.CustomFields2.Strings[ntnFieldGuid];
        //distributorName =  businessDetail.Name;

        buyerNTNCNIC = invoiceDetail.PartyNTNCNIC;
        buyerBussinessName = invoiceDetail.PartyName;
        buyerProvince = invoiceDetail.PartyProvince;
        bussinessDestinationAddress = invoiceDetail.invoiceData.BillingAddress;
    }

    const saleType = getFieldValue(invoiceDetail.invoiceData, invoiceSaleTypeFieldGuid);

    let reason = '';
    let reasonRemarks = '';
    let invoiceRefNo = '';

    if (invoiceType == 3 || invoiceType == 4) { //debit note or credit note
        reason = getFieldValue(invoiceDetail.invoiceData, reasonFieldGuid);
        reasonRemarks = getFieldValue(invoiceDetail.invoiceData, reasonRemarkFieldGuid);
        if (invoiceType == 3) {
            invoiceRefNo = invoiceDetail.invoiceData.PurchaseInvoice.Reference;
        } else {
            invoiceRefNo = invoiceDetail.invoiceData.SalesInvoice.Reference;
        }
    }

    let items = [];
    let saleValue = 0;
    let totalSalesTaxApplicable = 0;
    let totalRetailPrice = 0;
    let totalSTWithheldAtSource = 0;
    let totalExtraTax = 0;
    let totalFurtherTax = 0;
    let totalFEDPayable = 0;
    let totalWithholdingIncomeTaxApplicable = 0;
    let totalCVT = 0;
    let totalDiscount = 0;

    invoiceDetail.invoiceData.Lines.forEach(line => {
        const itmSaleType = getFieldValue(line.Item, itemSaleTypeFieldGuid);
        const item = {
            hsCode: getFieldValue(line.Item, hsCodeFieldGuid),
            productCode: line.Item.ItemCode,
            productDescription: line.Item.ItemName,
            rate: line.SalesUnitPrice,
            uoM: getFieldValue(line.Item, uoMFieldGuid),
            quantity: line.Qty,
            valueSalesExcludingST: (line.SalesUnitPrice * line.Qty) - line.DiscountAmount,
            salesTaxApplicable: ((line.SalesUnitPrice * line.Qty) - line.DiscountAmount) * (line.TaxCode.Rate / 100),
            retailPrice: line.Item.CustomFields2?.Decimals?.[retailPriceFieldGuid] || 0,
            salesTaxWithheldAtSource: 0,
            extraTax: 0,
            furtherTax: 0,
            sroScheduleNo: "",
            fedPayable: 0,
            cvt: 0,
            withholdingIncomeTaxApplicable: 0,
            whit_1: 0,
            whit_2: 0,
            whit_Section_1: "",
            whit_Section_2: "",
            totalValues: 0,
            discount: line.DiscountAmount,
            invoiceRefNo: invoiceRefNo,
            sroItemSerialNo: "",
            stWhAsWhAgent: 0,
            purchaseType: (invoiceType == 2 || invoiceType == 4) ? itmSaleType : "",
            saleType: (invoiceType == 1 || invoiceType == 3) ? itmSaleType : ""
        };

        items.push(item);

        saleValue += item.valueSalesExcludingST;
        totalSalesTaxApplicable += item.salesTaxApplicable;
        totalRetailPrice += item.retailPrice;
        totalSTWithheldAtSource += item.salesTaxWithheldAtSource;
        totalExtraTax += item.extraTax;
        totalFurtherTax += item.furtherTax;
        totalFEDPayable += item.fedPayable;
        totalWithholdingIncomeTaxApplicable += item.withholdingIncomeTaxApplicable;
        totalCVT += item.cvt;
        totalDiscount += item.discount;
    });

    const jsonRequest = {
        bposid: bposid,
        invoiceType: invoiceType,
        invoiceDate: invoiceDate,
        sellerNTNCNIC: sellerNTNCNIC,
        sellerBussinessName: sellerBussinessName,
        sellerProvince: sellerProvince,
        buyerNTNCNIC: buyerNTNCNIC,
        buyerBussinessName: buyerBussinessName,
        buyerProvince: buyerProvince,
        bussinessDestinationAddress: bussinessDestinationAddress,
        saleType: saleType,
        saleValue: saleValue,
        totalSalesTaxApplicable: totalSalesTaxApplicable,
        totalRetailPrice: totalRetailPrice,
        totalSTWithheldAtSource: totalSTWithheldAtSource,
        totalExtraTax: totalExtraTax,
        totalFurtherTax: totalFurtherTax,
        totalFEDPayable: totalFEDPayable,
        totalWithholdingIncomeTaxApplicable: totalWithholdingIncomeTaxApplicable,
        totalCVT: totalCVT,
        totalDiscount: totalDiscount,
        distributorNTNCNIC: distributorNTNCNIC,
        distributorName: distributorName,
        reason: reason,
        reasonRemarks: reasonRemarks,
        invoiceRefNo: invoiceRefNo,
        items: items
    };

    return jsonRequest;
}


function confirmAction() {
    let actionTitle = 'eInvoice Reporting';

    alertify.confirm(
        `<div style='text-align: center; font-size: larger;'>
            <p><span style='color: blue;'>FBR - ${actionTitle}</span></p><p></p>
            <p><span style='color: red;'>This action cannot be undone.</span></p>
            <p><span>Do you want to send this request to the server?</span></p>
        </div>`,
        function () {
            sendToFbrServer();
        }
    ).set({
        labels: { ok: 'Yes, send it!', cancel: 'Cancel' },
        title: `<span style='font-size: larger;'>${actionTitle}</span>`,
        transition: 'zoom'
    });
}

async function getFbrInvoice( reportingResultstring) {
    const apiResponseTextarea = document.getElementById('json-response');
    if (!reportingResultstring) {
        apiResponseTextarea.value = `Json Request is null or undefined.`;
        return;
    }else{
        var stringRequest = '{"invoiceRefNo": "' + reportingResultstring + '"}';
    }

    apiResponseTextarea.value = '';

    try {
        const response = await fetch(apiPathgetInvoice, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json; charset=UTF-8'
            },
                body: JSON.stringify(stringRequest)
        });

        if (!response.ok) {
            console.error('Response Error:', response.statusText);
            apiResponseTextarea.value = `Status Code: ${response.status}\n\nResponse Content:\n\n${response.statusText}`;
            return;
        }

        const responseBody = await response.json();

        apiResponseTextarea.value = `Status Code: ${response.status}\n\nResponse Content:\n\n${JSON.stringify(responseBody, null, 2)}`;

    } catch (error) {
        console.error('Network Error:', error);
        apiResponseTextarea.value = `Network error: ${error}`;
    }
}

async function sendToFbrServer() {
    const apiResponseTextarea = document.getElementById('json-response');
    const qrCodeDiv = document.getElementById('qrcode-content');
    const reportingResultElement = document.getElementById('reporting-result');

    if (!jsonRequest) {
        apiResponseTextarea.value = `Json Request is null or undefined.`;
        return;
    }

    apiResponseTextarea.value = '';
    qrCodeDiv.innerHTML = '';
    reportingResultElement.textContent = 'N/A';

    try {
        const response = await fetch(apiPathsendInvoice, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json; charset=UTF-8'
            },
                body: JSON.stringify(jsonRequest)
        });

        if (!response.ok) {
            console.error('Response Error:', response.statusText);
            apiResponseTextarea.value = `Status Code: ${response.status}\n\nResponse Content:\n\n${response.statusText}`;
            return;
        }

        const responseBody = await response.json();

        apiResponseTextarea.value = `Status Code: ${response.status}\n\nResponse Content:\n\n${JSON.stringify(responseBody, null, 2)}`;

        if (responseBody.result) {
                app.CustomFields2.Strings[eInvoiceStatusFieldGuid] = responseBody.result;
                reportingResultElement.textContent = responseBody.result;

                new QRCode(qrCodeDiv, {
                    text: responseBody.result,
                    width: 160,
                    height: 160,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.L
                });
        }
    } catch (error) {
        console.error('Network Error:', error);
        apiResponseTextarea.value = `Network error: ${error}`;
    }
}

function openPopupForm() {
    if (!invoiceDetail || !invoiceDetail.invoiceData) {
        console.error('invoiceDetail or invoiceDetail.invoiceData is not defined');
        return;
    }

    const reportingResult = invoiceDetail.invoiceData.CustomFields2 && invoiceDetail.invoiceData.CustomFields2.Strings
        ? invoiceDetail.invoiceData.CustomFields2.Strings[eInvoiceStatusFieldGuid] || "N/A"
        : "N/A";

    const modalHtml = `
    <div id='popup-modal' class='modal' style='display: block;'>
        <div class='modal-dialog' style='width: 700px;'>
            <div class='modal-content' style='border-radius: 8px;'>
                <div class='modal-header' style='background-color: #6c757d; color: white; border-top-left-radius: 8px; border-top-right-radius: 8px;'>
                    <button type='button' class='close' onclick="document.getElementById('popup-modal').remove();" style='color: white;'><i class="fa fa-times" aria-hidden="true"></i></button>
                    <div class='header'><i class='fa fa-at fa-spin fa-lg'></i>&nbsp;Pakistan - FBR eInvoice</div>
                </div>
                
                <div class='modal-body' style='background-color: #f9f9f9; padding: 20px;'>
                    <div class='row mb-3'>
                        <div class='col-md-12'>
                            <table class='table table-bordered'>
                                <tbody>
                                    <tr>
                                        <td><strong>Invoice Id:</strong></td>
                                        <td>${invoiceDetail.invoiceData.id || 'N/A'}</td>
                                        <td><strong>Reference:</strong></td>
                                        <td>${invoiceDetail.invoiceData.Reference || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Party Name:</strong></td>
                                        <td>${invoiceDetail.PartyName || 'N/A'}</td>
                                        <td><strong>Issue Date:</strong></td>
                                        <td>${invoiceDetail.invoiceData.IssueDate || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Reporting Result:</strong></td>
                                        <td id='reporting-result'>${reportingResult}</td>
                                        <td><strong>Invoice Type:</strong></td>
                                        <td>${invoiceDetail.invoiceType || 'N/A'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class='row mb-3'>
                        <div class='col-md-12' style='display: flex; justify-content: space-between;'>
                            <div style='width: 100%;'>
                                <textarea id='json-request' class='form-control input-sm language-json' style='width: 100%; min-height: 120px; height: auto; background-color: rgb(247, 247, 247); color: #000; margin-bottom: 10px; margin-right: 5px; white-space: pre-wrap; font-family: monospace; padding: 10px;' readonly>${JSON.stringify(jsonRequest, null, 2) || 'N/A'}</textarea>
                            </div>
                            <div style='width: 15px;'> &nbsp; </div>
                            <div style='width: 20%;'>
                                <div id='qrcode-content' style='background-color : rgb(247, 247, 247); border: 1px solid #bcbcbc; width: 120px; height: 120px; padding: 10px;'>
                                    <!-- QR Code div -->
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class='row mb-3'>
                        <div class='col-md-12'>
                            <textarea id='json-response' class='form-control input-sm language-json' style='width: 100%; min-height: 120px; height: auto; color: #000; padding: 10px; white-space: pre-wrap; font-family: monospace; background-color: rgb(247, 247, 247);' readonly></textarea>
                        </div>
                    </div>
                    
                    <div class='modal-footer' style='background-color: #f9f9f9; padding: 10px 0px; display: flex; justify-content: space-between; align-items: center;'>
                        <div style='margin-right: auto;'>
                            <button id='get-fbr-invoice-button' class='btn btn-primary' style='background-color: #28a745; border-color: #28a745;  display: ${reportingResult && reportingResult !== "N/A" ? 'none' : 'block'}' onclick='getFbrInvoice("${reportingResult}")'>GetInvoice Details</button>    
                            <button id='send-to-server-button' class='btn btn-primary' style='background-color: #007bff; border-color: #007bff; display: ${reportingResult && reportingResult !== "N/A" ? 'block' : 'none'}' onclick='confirmAction()'>Send to Server</button>                        </div>
                        <div>
                            <button class='btn btn-default' style='background-color: #6c757d; border-color: #6c757d; color: white;' onclick="document.getElementById('popup-modal').remove();">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv);

    const reportingResultElement = document.getElementById('reporting-result');
    const sendToServerButton = document.getElementById('send-to-server-button');
    const getFbrInvoiceButton = document.getElementById('get-fbr-invoice-button');

     if (!reportingResultElement.textContent || reportingResultElement.textContent === "N/A") {
        sendToServerButton.style.display = 'block';
        getFbrInvoiceButton.style.display = 'none';
    } else {
        sendToServerButton.style.display = 'none';
        getFbrInvoiceButton.style.display = 'block';
    }

    reportingResultElement.addEventListener('change', function () {
        const resultValue = this.textContent || this.innerText;
        if (!resultValue || resultValue === "N/A") {
            sendToServerButton.style.display = 'block';
            getFbrInvoiceButton.style.display = 'none';
        } else {
            sendToServerButton.style.display = 'none';
            getFbrInvoiceButton.style.display = 'block';
        }
    });

    
    if (reportingResult && reportingResult !== "N/A") {
        new QRCode(document.getElementById('qrcode-content'), {
            text: reportingResult,
            width: 160,
            height: 160,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.L
        });
    }
}


document.addEventListener('DOMContentLoaded', (event) => {
    const isInvoicePage = currentUrl.includes('/purchase-invoice-form?') || currentUrl.includes('/sales-invoice-form?') || currentUrl.includes('/debit-note-form?') || currentUrl.includes('/credit-note-form?');
    if (isInvoicePage) {
        const updateButton = document.querySelector(`button.btn.btn-success[onclick='ajaxPost(true)']`);
        if (updateButton) {
            const parentDiv = document.querySelector('.lg\\:mb-4');
            if (parentDiv) {
                const innerHTML = parentDiv.innerHTML;
                const containsDash = innerHTML.includes(' — ');
                if (containsDash) {
                    
                    Promise.all([
                        loadResource('https://cdn.jsdelivr.net/npm/alertifyjs/build/css/alertify.min.css', 'css'),
                        loadResource('https://cdn.jsdelivr.net/npm/alertifyjs/build/css/themes/default.min.css', 'css'),
                        loadResource('https://cdn.jsdelivr.net/npm/alertifyjs/build/alertify.min.js', 'js'),
                        loadResource('/resources/qrcode/qrcode.js','js')
                    ]).catch(error => {
                        console.error('Failed to load resources:', error);
                    });

                    businessDetail = GetBusinessDetail();
                    console.log("businessDetail :", businessDetail);
                    
                    const scriptElements = document.querySelectorAll('#nonBatchView script');
                    scriptElements.forEach(scriptElement => {
                        const scriptContent = scriptElement.textContent.trim();
                        if (scriptContent.includes('app = new Vue')) {
                            invoiceDetail = GetInvoiceDetail(scriptContent);
                            console.log("invoiceDetail :", invoiceDetail);
                        }
                    });

                    jsonRequest = getJsonRequest();
                    console.log("jsonRequest :", jsonRequest);
                    
                    const vModelFormDiv = document.getElementById('v-model-form');
                    const button = document.createElement('button');
                    
                    button.innerHTML = `<i class='fas fa-edit' style='color:green; font-size: 14px;'></i> FBR eInvoice`;
                    button.classList.add('bg-white', 'font-bold', 'border', 'border-neutral-300', 'hover:border-neutral-400', 'text-neutral-700', 'hover:text-neutral-800', 'rounded', 'py-2', 'px-4', 'hover:no-underline', 'hover:bg-neutral-100', 'hover:shadow-inner', 'dark:focus:ring-gray-700', 'dark:bg-gray-800', 'dark:text-gray-400', 'dark:border-gray-600', 'dark:hover:text-white', 'dark:hover:bg-gray-700');
                    button.style.fontSize = '12px';

                    button.onclick = function () {
                        openPopupForm();
                    };
                    
                    const headerDiv = vModelFormDiv.querySelector('.flex');
                    headerDiv.appendChild(button);
                }
            }
        }
    }
});