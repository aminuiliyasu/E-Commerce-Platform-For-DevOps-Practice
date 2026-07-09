package com.aminuiliyasu.ecommerce.payment.service;

import com.aminuiliyasu.ecommerce.payment.entity.Payment;
import com.aminuiliyasu.ecommerce.payment.entity.PaymentMethod;
import com.aminuiliyasu.ecommerce.payment.entity.PaymentStatus;
import com.aminuiliyasu.ecommerce.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;

    @Transactional
    public Payment processMockPayment(Long orderId, BigDecimal amount) {
        Payment payment = Payment.builder()
                .orderId(orderId)
                .transactionId("TXN-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase())
                .amount(amount)
                .status(PaymentStatus.COMPLETED)
                .paymentMethod(PaymentMethod.MOCK)
                .build();
        return paymentRepository.save(payment);
    }
}
