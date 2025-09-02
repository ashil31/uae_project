
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { serverUrl } from '../services/url';

const InvoicePage = () => {
  const { orderId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchInvoice(orderId);
    }
  }, [orderId]);


  const fetchInvoice = async (id) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${serverUrl}/invoices/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(response.data);
      
      
      if (response.data.success) {
        setInvoice(response.data.invoice);
      } else {
        throw new Error(data.message || 'Failed to fetch invoice');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to fetch invoice');
      setInvoice(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!invoice) return;
    
    // Create a new window with the invoice content for PDF generation
    const printWindow = window.open('', '_blank');
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              color: #333;
              line-height: 1.6;
            }
            .invoice-container { 
              max-width: 800px; 
              margin: 0 auto; 
              background: white;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 30px; 
              padding-bottom: 20px;
              border-bottom: 2px solid #eee;
            }
            .company-info h2 { 
              margin: 0 0 10px 0; 
              font-size: 28px; 
              color: #2563eb;
            }
            .company-info p { 
              margin: 2px 0; 
              font-size: 14px; 
              color: #666;
            }
            .invoice-info { 
              text-align: right; 
            }
            .invoice-info h3 { 
              margin: 0 0 10px 0; 
              font-size: 24px; 
              color: #333;
            }
            .invoice-info p { 
              margin: 2px 0; 
              font-size: 14px;
            }
            .customer-info { 
              margin-bottom: 30px; 
            }
            .customer-info h4 { 
              margin: 0 0 10px 0; 
              font-size: 16px; 
              color: #333;
            }
            .customer-info p { 
              margin: 2px 0; 
              font-size: 14px; 
              color: #666;
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 30px; 
            }
            .items-table th { 
              background-color: #f8f9fa; 
              padding: 12px; 
              text-align: left; 
              border-bottom: 2px solid #dee2e6; 
              font-weight: 600;
            }
            .items-table td { 
              padding: 12px; 
              border-bottom: 1px solid #dee2e6; 
            }
            .items-table .text-right { 
              text-align: right; 
            }
            .items-table .text-center { 
              text-align: center; 
            }
            .totals { 
              float: right; 
              width: 300px; 
              margin-bottom: 30px;
            }
            .totals table { 
              width: 100%; 
              border-collapse: collapse;
            }
            .totals td { 
              padding: 8px 0; 
              border-bottom: 1px solid #eee;
            }
            .totals .total-row { 
              font-weight: bold; 
              font-size: 18px; 
              border-top: 2px solid #333;
              border-bottom: 2px solid #333;
            }
            .payment-info { 
              clear: both; 
              margin-bottom: 30px; 
            }
            .payment-info h4 { 
              margin: 0 0 10px 0; 
              font-size: 16px; 
              color: #333;
            }
            .payment-status { 
              display: inline-block; 
              padding: 4px 8px; 
              border-radius: 4px; 
              font-size: 12px; 
              font-weight: bold;
            }
            .status-paid { 
              background-color: #d4edda; 
              color: #155724; 
            }
            .status-pending { 
              background-color: #fff3cd; 
              color: #856404; 
            }
            .notes { 
              margin-bottom: 30px; 
            }
            .notes h4 { 
              margin: 0 0 10px 0; 
              font-size: 16px; 
              color: #333;
            }
            .footer { 
              text-align: center; 
              padding-top: 20px; 
              border-top: 1px solid #eee; 
              color: #666; 
              font-size: 14px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-info">
                <h2>${invoice.company.name}</h2>
                <p>${invoice.company.address.street}</p>
                <p>${invoice.company.address.city}, ${invoice.company.address.state} ${invoice.company.address.zip}</p>
                <p>${invoice.company.address.country}</p>
                <p>Phone: ${invoice.company.phone}</p>
                <p>Email: ${invoice.company.email}</p>
                <p>Website: ${invoice.company.website}</p>
                <p><strong>${invoice.company.taxNumber}</strong></p>
              </div>
              <div class="invoice-info">
                <h3>INVOICE</h3>
                <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
                <p><strong>Order ID:</strong> ${invoice.orderId}</p>
                <p><strong>Issue Date:</strong> ${new Date(invoice.issueDate).toLocaleDateString()}</p>
                <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div class="customer-info">
              <h4>Bill To:</h4>
              <p><strong>${invoice.customer.name}</strong></p>
              <p>${invoice.customer.address.street}</p>
              <p>${invoice.customer.address.city}, ${invoice.customer.address.state} ${invoice.customer.address.zip}</p>
              <p>${invoice.customer.address.country}</p>
              <p>Email: ${invoice.customer.email}</p>
              <p>Phone: ${invoice.customer.phone}</p>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map(item => `
                  <tr>
                    <td>
                      <strong>${item.name}</strong><br>
                      <small style="color: #666;">${item.description}</small>
                    </td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">$${item.unitPrice.toFixed(2)}</td>
                    <td class="text-right">$${item.total.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals">
              <table>
                <tr>
                  <td>Subtotal:</td>
                  <td class="text-right">$${invoice.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>VAT (5%):</td>
                  <td class="text-right">$${invoice.tax.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Shipping:</td>
                  <td class="text-right">$${invoice.shipping.toFixed(2)}</td>
                </tr>
                ${invoice.discount > 0 ? `
                <tr>
                  <td>Discount:</td>
                  <td class="text-right" style="color: #dc3545;">-$${invoice.discount.toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr class="total-row">
                  <td>Total:</td>
                  <td class="text-right">$${(invoice.subtotal + invoice.tax + invoice.shipping - invoice.discount).toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <div class="payment-info">
              <h4>Payment Information</h4>
              <p><strong>Payment Method:</strong> ${invoice.paymentMethod}</p>
              <p><strong>Payment Status:</strong> 
                <span class="payment-status ${invoice.paymentStatus === 'Paid' ? 'status-paid' : 'status-pending'}">
                  ${invoice.paymentStatus}
                </span>
              </p>
            </div>

            ${invoice.notes ? `
            <div class="notes">
              <h4>Notes</h4>
              <p>${invoice.notes}</p>
            </div>
            ` : ''}

            <div class="footer">
              <p>Thank you for your business!</p>
              <p>For any questions regarding this invoice, please contact us at ${invoice.company.email}</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
    
    toast.success('PDF generation initiated');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Invoice not found</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Invoice {invoice.invoiceNumber} - UAE Fashion Admin</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Action Buttons */}
        <div className="flex items-center justify-between print:hidden">
          <h1 className="text-3xl font-bold text-gray-900">Invoice {invoice.invoiceNumber}</h1>
          <div className="flex space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Print Invoice
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="bg-white rounded-lg shadow-sm border p-8 print:shadow-none print:border-none">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{invoice.company.name}</h2>
              <div className="mt-2 text-sm text-gray-600">
                <p>{invoice.company.address.street}</p>
                <p>{invoice.company.address.city}, {invoice.company.address.state} {invoice.company.address.zip}</p>
                <p>{invoice.company.address.country}</p>
                <p className="mt-1">Phone: {invoice.company.phone}</p>
                <p>Email: {invoice.company.email}</p>
                <p>Website: {invoice.company.website}</p>
                <p className="mt-1 font-medium">{invoice.company.taxNumber}</p>
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold text-gray-900">INVOICE</h3>
              <div className="mt-2 text-sm">
                <p><span className="font-medium">Invoice Number:</span> {invoice.invoiceNumber}</p>
                <p><span className="font-medium">Order ID:</span> {invoice.orderId}</p>
                <p><span className="font-medium">Issue Date:</span> {new Date(invoice.issueDate).toLocaleDateString()}</p>
                <p><span className="font-medium">Due Date:</span> {new Date(invoice.dueDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="mb-8">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Bill To:</h4>
            <div className="text-sm text-gray-600">
              <p className="font-medium">{invoice.customer.name}</p>
              <p>{invoice.customer.address.street}</p>
              <p>{invoice.customer.address.city}, {invoice.customer.address.state} {invoice.customer.address.zip}</p>
              <p>{invoice.customer.address.country}</p>
              <p className="mt-1">Email: {invoice.customer.email}</p>
              <p>Phone: {invoice.customer.phone}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 font-medium text-gray-900">Item</th>
                  <th className="text-center py-2 font-medium text-gray-900">Qty</th>
                  <th className="text-right py-2 font-medium text-gray-900">Unit Price</th>
                  <th className="text-right py-2 font-medium text-gray-900">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-3">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm pr-12 text-gray-600">{item.description}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">{item.quantity}</td>
                    <td className="py-3 px-2 text-right">{item.unitPrice.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right">{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">VAT (5%):</span>
                <span className="font-medium">${invoice.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Shipping:</span>
                <span className="font-medium">${invoice.shipping.toFixed(2)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">-${invoice.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-300 mt-2 pt-2">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900">Total:</span>
                  <span className="text-lg font-bold text-gray-900">${(invoice.subtotal + invoice.tax + invoice.shipping - invoice.discount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="mb-8">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Payment Information</h4>
            <div className="text-sm text-gray-600">
              <p><span className="font-medium">Payment Method:</span> {invoice.paymentMethod}</p>
              <p><span className="font-medium">Payment Status:</span> 
                <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                  invoice.paymentStatus === 'Paid' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {invoice.paymentStatus}
                </span>
              </p>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-8">
              <h4 className="text-lg font-medium text-gray-900 mb-2">Notes</h4>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-300 pt-4 text-center text-sm text-gray-500">
            <p>Thank you for your business!</p>
            <p className="mt-1">For any questions regarding this invoice, please contact us at {invoice.company.email}</p>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default InvoicePage;
