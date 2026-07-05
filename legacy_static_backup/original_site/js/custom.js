// Updated custom.js with Cashfree Payment Integration

(function ($) {
  "use strict";

  // MENU
  $("#sidebarMenu .nav-link").on("click", function () {
    $("#sidebarMenu").collapse("hide");
  });

  // CUSTOM LINK
  $(".smoothscroll").click(function () {
    var el = $(this).attr("href");
    var elWrapped = $(el);
    var header_height = $(".navbar").height();

    scrollToDiv(elWrapped, header_height);
    return false;

    function scrollToDiv(element, navheight) {
      var offset = element.offset();
      var offsetTop = offset.top;
      var totalScroll = offsetTop - navheight;

      $("body,html").animate(
        {
          scrollTop: totalScroll,
        },
        300
      );
    }
  });
})(window.jQuery);

document.addEventListener("DOMContentLoaded", function () {
  const counters = document.querySelectorAll(".counter");
  const speed = 200;

  function animateCounters() {
    counters.forEach((counter) => {
      const target = +counter.getAttribute("data-count");
      const count = +counter.innerText;
      const increment = target / speed;

      if (count < target) {
        counter.innerText = Math.ceil(count + increment);
        setTimeout(animateCounters, 1);
      } else {
        counter.innerText = target;
      }
    });
  }

  // Trigger animation when section is in view
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounters();
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  const statsSection = document.querySelector(".stats-row");
  if (statsSection) {
    observer.observe(statsSection);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const bookingDate = document.getElementById("booking-date");
  const timeSlotSelect = document.getElementById("time-slot");
  const sportSelect = document.getElementById("sport-select");
  const bookingForm = document.getElementById("booking-form");
  const dayPricingInfo = document.getElementById("day-pricing-info");
  const dayDetails = document.getElementById("day-details");
  const totalCalculation = document.getElementById("total-calculation");
  const calculationDetails = document.getElementById("calculation-details");
  const blackoutInfo = document.getElementById("blackout-info");

  let currentDayData = null;
  let cashfree = null;

  // Check for payment return parameters
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('payment_status');
  const orderId = urlParams.get('order_id');

  if (paymentStatus && orderId) {
    handlePaymentReturn(paymentStatus, orderId);
  }

  // Initialize Cashfree
  if (window.Cashfree) {
    cashfree = Cashfree({
      mode: "production", // Change to 'production' for live environment
    //   mode: "sandbox",
    });
  }

  // Set minimum date (today)
  const today = new Date();
  const minDate = today.toISOString().split("T")[0];
  bookingDate.setAttribute("min", minDate);

  // Update time slots when date or sport changes
  bookingDate.addEventListener("change", loadAvailableSlots);
  sportSelect.addEventListener("change", loadAvailableSlots);
  timeSlotSelect.addEventListener("change", updateTotalCalculation);

  // Update API base URL to your Laravel backend
  const API_BASE_URL = "https://khelopatna.in"; // Change this to your production URL

  // Handle payment return from Cashfree
  async function handlePaymentReturn(paymentStatus, orderId) {
    console.log('Handling payment return:', { paymentStatus, orderId });
    
    if (paymentStatus === 'success') {
      showPaymentLoader();
      
      try {
        // Verify payment and create booking
        const verifyResponse = await fetch(`${API_BASE_URL}/api/payment/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ order_id: orderId }),
        });

        const verifyResult = await verifyResponse.json();
        console.log("Payment verification on return:", verifyResult);

        if (verifyResult.success && verifyResult.payment_status === "SUCCESS") {
          // Payment verified, now check if booking was already created
          // If not, we need the original booking data to create it
          // For now, show success message and ask user to contact support
          hidePaymentLoader();
          alert("Payment successful! If you don't receive booking confirmation shortly, please contact support with Order ID: " + orderId);
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          hidePaymentLoader();
          alert("Payment verification failed. Please contact support with Order ID: " + orderId);
        }
      } catch (error) {
        hidePaymentLoader();
        console.error('Payment return verification error:', error);
        alert("Error verifying payment. Please contact support with Order ID: " + orderId);
      }
    } else if (paymentStatus === 'pending') {
      alert("Payment is being processed. You will receive confirmation shortly.");
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      alert("Payment was not completed. Please try again.");
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  async function loadAvailableSlots() {
    if (!bookingDate.value || !sportSelect.value) {
      timeSlotSelect.innerHTML = "";
      dayPricingInfo.style.display = "none";
      totalCalculation.style.display = "none";
      blackoutInfo.textContent = "Loading availability information...";
      return;
    }

    try {
      const sport = sportSelect.value;
      const date = bookingDate.value;
      const url = `${API_BASE_URL}/api/available-slots?sport=${encodeURIComponent(sport)}&date=${encodeURIComponent(date)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const data = await response.json();

      if (data.error) {
        alert("Error loading slots: " + data.error);
        return;
      }

      currentDayData = data.day_info;

      // Update blackout information
      const blackoutStart = formatHour(data.day_info.blackout_hours.start);
      const blackoutEnd = formatHour(data.day_info.blackout_hours.end);
      blackoutInfo.innerHTML = `
        <strong>${data.day_info.day_name}</strong> - Unavailable from ${blackoutStart} to ${blackoutEnd}
      `;

      // Update day and pricing information
      dayDetails.innerHTML = `
        <div class="row">
          <div class="col-md-6">
            <strong>Day:</strong> ${data.day_info.day_name}
          </div>
          <div class="col-md-6">
            <strong>Base Rate:</strong> ₹${data.day_info.hourly_rate || "Variable"}/hour
          </div>
        </div>
        <div class="row mt-2">
          <div class="col-12">
            <strong>Blackout Hours:</strong> ${blackoutStart} - ${blackoutEnd}
          </div>
        </div>
        <div class="row mt-2">
          <div class="col-12">
            <small class="text-muted">Note: Actual rates may vary by time slot</small>
          </div>
        </div>
      `;
      dayPricingInfo.style.display = "block";

      // Populate time slots
      timeSlotSelect.innerHTML = "";
      const selectedDate = new Date(bookingDate.value);
      const now = new Date();
      const isToday = selectedDate.toDateString() === now.toDateString();
      const advanceBookingHours = 1;

      data.slots.forEach((slot) => {
        const option = document.createElement("option");
        option.value = slot.value;
        option.textContent = `${slot.text} - ₹${slot.price}`;

        // Apply advance booking restriction for today's slots
        if (isToday && advanceBookingHours > 0) {
          const currentHour = now.getHours();
          const currentMinutes = now.getMinutes();
          const cutoffHour =
            currentHour +
            (currentMinutes > 0
              ? advanceBookingHours + 1
              : advanceBookingHours);
          const slotHour = parseInt(slot.value.split("-")[0]);

          if (slotHour < cutoffHour) {
            option.disabled = true;
            option.classList.add("disabled-slot");
            option.textContent += " (Too Late to Book)";
          }
        }

        // Mark unavailable slots
        if (!slot.available) {
          option.disabled = true;
          if (slot.booked) {
            option.classList.add("disabled-slot");
            option.textContent += " (Already Booked)";
          } else if (slot.blackout) {
            option.classList.add("blackout-slot");
            option.textContent += " (Academy Hours)";
          }
        }

        timeSlotSelect.appendChild(option);
      });

      updateTotalCalculation();
    } catch (error) {
      console.error("Error loading slots:", error);
      alert("Error loading available slots. Please try again.");
    }
  }

  function updateTotalCalculation() {
    const selectedSlots = Array.from(timeSlotSelect.selectedOptions).filter(
      (opt) => !opt.disabled
    );

    if (selectedSlots.length === 0 || !currentDayData) {
      totalCalculation.style.display = "none";
      return;
    }

    const totalHours = selectedSlots.length;
    let totalAmount = 0;

    selectedSlots.forEach((option) => {
      const optionText = option.textContent;
      const priceMatch = optionText.match(/₹(\d+)/);
      if (priceMatch) {
        const price = parseInt(priceMatch[1]);
        totalAmount += price;
      }
    });

    const avgHourlyRate =
      totalHours > 0 ? Math.round(totalAmount / totalHours) : 0;

    calculationDetails.innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <strong>Selected Slots:</strong> ${totalHours} hour(s)
        </div>
        <div class="col-md-6">
          <strong>Avg Rate:</strong> ₹${avgHourlyRate}/hour
        </div>
      </div>
      <div class="row mt-2">
        <div class="col-12">
          <strong>Total Amount:</strong> ₹${totalAmount}
        </div>
      </div>
      <div class="row mt-1">
        <div class="col-12">
          <small class="text-muted">Selected slots: ${selectedSlots
            .map((opt) => opt.value)
            .join(", ")}</small>
        </div>
      </div>
    `;
    totalCalculation.style.display = "block";
  }

  function formatHour(hour) {
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return hour12 + ":00 " + ampm;
  }

  function showPaymentLoader() {
    const overlay = document.getElementById("payment-loader-overlay");
    if (overlay) {
      overlay.style.display = "flex";
      overlay.classList.add("show");
      document.body.style.overflow = "hidden";

      const modalBackdrop = document.querySelector(".modal-backdrop");
      if (modalBackdrop) {
        modalBackdrop.style.display = "none";
      }
    }
  }

  function hidePaymentLoader() {
    const overlay = document.getElementById("payment-loader-overlay");
    if (overlay) {
      overlay.style.display = "none";
      overlay.classList.remove("show");
      document.body.style.overflow = "auto";

      const modalBackdrop = document.querySelector(".modal-backdrop");
      if (modalBackdrop) {
        modalBackdrop.style.display = "block";
      }
    }
  }

  // Cashfree payment processing
  async function processCashfreePayment(bookingData, amount) {
    try {
      showPaymentLoader();

      // Step 1: Create payment order
      const orderResponse = await fetch(
        `${API_BASE_URL}/api/payment/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            amount: amount,
            currency: "INR",
            customer_name: bookingData.full_name,
            customer_email: bookingData.email,
            customer_phone: bookingData.mobile,
            booking_data: bookingData, // Pass booking data for reference
          }),
        }
      );

      const orderResult = await orderResponse.json();
      console.log("Order creation response:", orderResult);

      if (!orderResult.success) {
        throw new Error(
          orderResult.message || "Failed to create payment order"
        );
      }

      hidePaymentLoader();

      // Step 2: Initialize Cashfree checkout
      if (!cashfree) {
        throw new Error("Cashfree SDK not loaded");
      }

      const checkoutOptions = {
        paymentSessionId: orderResult.payment_session_id,
        redirectTarget: "_modal", // Options: '_self', '_blank', '_top', '_modal'
      };

      console.log(
        "Initiating Cashfree checkout with options:",
        checkoutOptions
      );

      const checkoutResult = await cashfree.checkout(checkoutOptions);
      
      console.log("Checkout result:", checkoutResult);

      // Handle different checkout result scenarios
      if (checkoutResult.error) {
        console.error("Payment failed:", checkoutResult.error);
        alert("Payment failed: " + checkoutResult.error.message);
        window.location.href = "book-now.html";
      } else if (checkoutResult.paymentDetails) {
        // Payment completed successfully
        console.log("Payment completed, verifying...");
        await verifyPaymentAndCreateBooking(orderResult.order_id, bookingData);
      } else if (checkoutResult.redirect === true) {
        // Payment was redirected (usually means success)
        console.log("Payment redirected, verifying...");
        await verifyPaymentAndCreateBooking(orderResult.order_id, bookingData);
      } else {
        // Payment was cancelled, closed, or failed
        console.log("Payment was cancelled or failed:", checkoutResult);
        
        // Check if there's a specific reason
        if (checkoutResult.reason === "user_cancelled") {
          alert("Payment was cancelled. Please try again.");
        } else if (checkoutResult.reason === "payment_failed") {
          alert("Payment failed. Please try again with a different payment method.");
          window.location.href = "book-now.html";
        } else {
          // For any other case, try to verify the payment status
          console.log("Uncertain payment status, attempting verification...");
          await verifyPaymentAndCreateBooking(orderResult.order_id, bookingData);
        }
      }
    } catch (error) {
      hidePaymentLoader();
      console.error("Payment processing error:", error);
      alert("Payment processing failed: " + error.message);
    }
  }

  // Verify payment and create booking
  async function verifyPaymentAndCreateBooking(orderId, bookingData) {
    try {
      showPaymentLoader();

      // Update loader text
      const loaderContent = document.querySelector(
        ".payment-loader-content h5"
      );
      if (loaderContent) {
        loaderContent.textContent = "Verifying payment...";
      }

      // Step 1: Verify payment with retry logic
      let verifyResult = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const verifyResponse = await fetch(`${API_BASE_URL}/api/payment/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ order_id: orderId }),
          });

          verifyResult = await verifyResponse.json();
          console.log(`Payment verification attempt ${retryCount + 1}:`, verifyResult);

          // If payment is successful, break out of retry loop
          if (verifyResult.success && verifyResult.payment_status === "SUCCESS") {
            break;
          }

          // If payment is still pending, wait and retry
          if (verifyResult.payment_status === "PENDING" || verifyResult.payment_status === "ACTIVE") {
            retryCount++;
            if (retryCount < maxRetries) {
              console.log(`Payment still pending, retrying in 2 seconds... (${retryCount}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }
          }

          // If payment failed or other status, break
          break;

        } catch (error) {
          console.error(`Verification attempt ${retryCount + 1} failed:`, error);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (!verifyResult || !verifyResult.success || verifyResult.payment_status !== "SUCCESS") {
        // Payment verification failed - show appropriate message
        hidePaymentLoader();
        
        if (verifyResult && verifyResult.payment_status === "PENDING") {
          alert("Payment is being processed. You will receive confirmation shortly. Please check your email or contact support if needed.");
          return;
        } else if (verifyResult && verifyResult.payment_status === "FAILED") {
          alert("Payment failed. Please try again with a different payment method.");
          return;
        } else {
          throw new Error("Payment verification failed. Please contact support with your order ID: " + orderId);
        }
      }

      // Update loader text
      if (loaderContent) {
        loaderContent.textContent = "Creating booking...";
      }

      // Step 2: Create booking with payment confirmation
      const bookingResponse = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...bookingData,
          payment_method: "cashfree",
          payment_order_id: orderId,
          payment_status: "SUCCESS",
          payment_details: verifyResult.payment_details,
        }),
      });

      const bookingResult = await bookingResponse.json();
      console.log("Booking creation response:", bookingResult);

      hidePaymentLoader();

      if (bookingResult.success) {
        // Close payment modal
        const paymentModal = bootstrap.Modal.getInstance(
          document.getElementById("paymentModal")
        );
        if (paymentModal) {
          paymentModal.hide();
        }

        // Redirect to success page
        const queryParams = new URLSearchParams({
          id: bookingResult.booking_id,
          name: encodeURIComponent(bookingResult.full_name),
          date: bookingResult.booking_date,
          amount: bookingResult.total_amount,
          paid: bookingResult.paid_amount,
          remaining: bookingResult.remaining_amount || 0,
          sport: bookingData.sport,
          time_slots: encodeURIComponent(bookingData.time_slots.join(",")),
          email: bookingData.email || "",
          mobile: bookingData.mobile,
          payment_method: "cashfree",
        });

        window.location.href = `booking-confirmed.html?${queryParams.toString()}`;
      } else {
        throw new Error(bookingResult.error || "Booking creation failed");
      }
    } catch (error) {
      hidePaymentLoader();
      console.error("Booking creation error:", error);
      alert(
        "Booking creation failed: " +
          error.message +
          ". Please contact support with your payment details."
      );
    }
  }

  // Form submission
  bookingForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Validation
    const mobileInput = document.getElementById("mobile");
    const emailInput = document.getElementById("email");

    // Mobile validation (10 digits)
    if (!/^\d{10}$/.test(mobileInput.value)) {
      alert("Please enter a valid 10-digit mobile number");
      mobileInput.focus();
      return;
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
      alert("Please enter a valid email address");
      emailInput.focus();
      return;
    }

    const selectedSlots = Array.from(timeSlotSelect.selectedOptions)
      .filter((opt) => !opt.disabled)
      .map((opt) => opt.value);

    if (selectedSlots.length === 0) {
      alert("Please select at least one available time slot");
      return;
    }

    // Calculate total amount from selected slot prices
    let totalAmount = 0;
    const selectedOptions = Array.from(timeSlotSelect.selectedOptions).filter(
      (opt) => !opt.disabled
    );

    selectedOptions.forEach((option) => {
      const optionText = option.textContent;
      const priceMatch = optionText.match(/₹(\d+)/);
      if (priceMatch) {
        totalAmount += parseInt(priceMatch[1]);
      }
    });

    const partialPayment = document.getElementById("partial-payment").checked;

    if (partialPayment) {
      totalAmount = Math.ceil(totalAmount * 0.5); // 50% of total
    }

    const bookingData = {
      sport: sportSelect.value,
      booking_date: bookingDate.value,
      time_slots: selectedSlots,
      full_name: document.getElementById("full-name").value,
      mobile: document.getElementById("mobile").value,
      email: document.getElementById("email").value,
      partial_payment: partialPayment,
    };

    // Show payment options modal
    document.getElementById("payment-amount").textContent = `₹${totalAmount}`;
    const paymentModal = new bootstrap.Modal(
      document.getElementById("paymentModal")
    );
    paymentModal.show();

    // Handle Cashfree payment (replacing PhonePe)
    const cashfreePaymentBtn = document.getElementById("phonepe-payment-btn");
    if (cashfreePaymentBtn) {
      // Update button text and styling
      cashfreePaymentBtn.innerHTML = `
        <div class="d-flex align-items-center justify-content-center">
          <span class="material-icons-outlined me-2">payment</span>
          <span>Pay with Cashfree</span>
        </div>
        <small class="d-block text-muted mt-1">Cards, UPI, Net Banking & More</small>
      `;

      // Remove old event listeners and add new one
      const newBtn = cashfreePaymentBtn.cloneNode(true);
      cashfreePaymentBtn.parentNode.replaceChild(newBtn, cashfreePaymentBtn);

      newBtn.addEventListener("click", async function () {
        await processCashfreePayment(bookingData, totalAmount);
      });
    }

    // Handle manual UPI payment (existing functionality)
    const paymentForm = document.getElementById("payment-confirmation-form");
    if (paymentForm) {
      // Remove old event listeners
      const newForm = paymentForm.cloneNode(true);
      paymentForm.parentNode.replaceChild(newForm, paymentForm);

      newForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const confirmBtn = document.getElementById("confirm-payment-btn");
        const transactionId = document
          .getElementById("transaction-id")
          .value.trim();

        if (!transactionId) {
          alert("Please enter your transaction ID");
          return;
        }

        // Show spinner and disable button
        confirmBtn.classList.add("btn-disabled");
        confirmBtn.disabled = true;

        const formData = {
          ...bookingData,
          transaction_id: transactionId,
          payment_method: "upi",
        };

        try {
          const response = await fetch(`${API_BASE_URL}/api/bookings`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(formData),
          });

          const result = await response.json();

          if (result.success) {
            const queryParams = new URLSearchParams({
              id: result.booking_id,
              name: encodeURIComponent(result.full_name),
              date: result.booking_date,
              amount: result.total_amount,
              paid: result.paid_amount,
              remaining: result.remaining_amount || 0,
              sport: formData.sport,
              time_slots: encodeURIComponent(formData.time_slots.join(",")),
              email: formData.email || "",
              mobile: formData.mobile,
              payment_method: "upi",
            });

            // Close modal
            const paymentModal = bootstrap.Modal.getInstance(
              document.getElementById("paymentModal")
            );
            if (paymentModal) {
              paymentModal.hide();
            }

            window.location.href = `booking-confirmed.html?${queryParams.toString()}`;
          } else {
            // Re-enable button on error
            confirmBtn.classList.remove("btn-disabled");
            confirmBtn.disabled = false;

            alert("Booking failed: " + result.error);
          }
        } catch (error) {
          // Re-enable button on error
          confirmBtn.classList.remove("btn-disabled");
          confirmBtn.disabled = false;

          console.error("Error creating booking:", error);
          alert("Booking failed. Please try again.");
        }
      });
    }
  });
});

// Handle popup banner functionality
document.addEventListener("DOMContentLoaded", function () {
  const popup = document.getElementById("popupBanner");
  const closeBtn = document.getElementById("closePopup");

  if (popup && closeBtn) {
    // Show popup on page load
    popup.style.display = "flex";

    // Close popup when X is clicked
    closeBtn.addEventListener("click", function () {
      popup.style.display = "none";
    });

    // Close popup when clicking outside the image
    popup.addEventListener("click", function (e) {
      if (e.target === popup) {
        popup.style.display = "none";
      }
    });
  }
});
