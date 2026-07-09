package com.aminuiliyasu.ecommerce.notification;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class NotificationConfig {

    public static final String NOTIFICATION_QUEUE = "order.notifications";

    @Bean
    public Queue orderNotificationQueue() {
        return new Queue(NOTIFICATION_QUEUE, true);
    }

    @Bean
    public Binding orderNotificationBinding(Queue orderNotificationQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(orderNotificationQueue).to(orderExchange).with("order.confirmed");
    }
}
