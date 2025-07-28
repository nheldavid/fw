      const init = async () => {
        try {
          const client = await window.frsh_init();

          const context = await client.instance.context();

          document.getElementById("customer-name").innerHTML =  context.data.customerName || 'Not Available';
          document.getElementById("customer-email").innerHTML = context.data.customerEmail || 'Not Available';
          document.getElementById("billing-address").innerHTML = context.data.billingAddress || 'Not Available';
          document.getElementById("central-order-account").innerHTML = context.data.centralOrderAccount || 'Not Available';
          document.getElementById("communication").innerHTML = context.data.communication || 'Not Available';
          //document.getElementById("shipment-number").innerHTML = context.data.shipmentNumber || 'Not Available';
          // document.getElementById("order-number").innerHTML = context.data.orderNumber || 'Not Available';
          // document.getElementById("fde-order-number").innerHTML = context.data.fdeOrderNumber || 'Not Available';
          // document.getElementById("order-date").innerHTML = context.data.orderDate || 'Not Available';
          // document.getElementById("total-amount").innerHTML = context.data.totalAmount || 'Not Available';
          // document.getElementById("payment-method").innerHTML = context.data.paymentMethod || 'Not Available';
          // document.getElementById("order-comment").innerHTML = context.data.orderComment || 'Not Available';
          // document.getElementById("position").innerHTML = context.data.position || 'Not Available';
          // document.getElementById("product-name").innerHTML = context.data.productName || 'Not Available';
          // document.getElementById("quantity").innerHTML = context.data.quantity || 'Not Available';
          // document.getElementById("price").innerHTML = context.data.price || 'Not Available';
          // document.getElementById("total-price").innerHTML = context.data.totalPrice || 'Not Available';
          // document.getElementById("optional-extras").innerHTML = context.data.optionalExtras || 'Not Available';
          // document.getElementById("planned-delivery-date").innerHTML = context.data.plannedDeliveryDate || 'Not Available';
          // document.getElementById("actual-delivery-date").innerHTML = context.data.actualDeliveryDate || 'Not Available';
          // document.getElementById("delivery-status").innerHTML = context.data.deliveryStatus || 'Not Available';
          // document.getElementById("shipment-number").innerHTML = context.data.shipmentNumber || 'Not Available';
          // document.getElementById("self-delivery-receipt").innerHTML = context.data.selfDeliveryReceipt || 'Not Available';
          // document.getElementById("comlplaint-reason1").value = context.data.complaintReason1 || 'Not Available';
          // document.getElementById("comlplaint-reason2").value = context.data.complaintReason2 || 'Not Available';
          // document.getElementById("refund-amount").innerHTML = context.data.refundAmount || 'Not Available';
          // document.getElementById("credit-note").innerHTML = context.data.creditNote || 'Not Available';
          // document.getElementById("complaint-status").innerHTML = context.data.complaintStatus || 'Not Available';
          // document.getElementById("central-number").innerHTML = context.data.centralNumber || 'Not Available';
          // document.getElementById("delivery-date").innerHTML = context.data.deliveryDate || 'Not Available';
          // document.getElementById("order-status").value = context.data.orderStatus || 'Not Available';  
          console.log("Modal instance method context", context);
          } catch (error) {
          console.log('Child:DataApi', error);
        }
      };

      init();