package com.aminuiliyasu.ecommerce.notification;

import com.aminuiliyasu.ecommerce.order.event.OrderConfirmedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class OrderNotificationListener {

    @RabbitListener(queues = "order.notifications")
    public void handleOrderConfirmed(OrderConfirmedEvent event) {
        log.info("Order confirmation email sent to {} for order {} (total: {})",
                event.getUserEmail(), event.getOrderNumber(), event.getTotal());
    }
}
