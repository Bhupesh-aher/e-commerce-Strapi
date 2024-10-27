'use strict';
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * order controller
 */


const { createCoreController } = require("@strapi/strapi").factories;



module.exports = createCoreController("api::order.order", ({strapi}) => ({
    async create(ctx) {
        
        
        console.log("Frontend URL:",process.env.FRONTEND_URL);
        
        const {products, userName, email} = ctx.request.body;
        console.log("request body", ctx.request.body);
        

        console.log("Received products:", products); // Log incoming products
        console.log("Received userName:", userName); // Log incoming userName
        console.log("Received email:", email);

        try{
            // retrieve item information
            const lineItems = await Promise.all(
                products.map(async (product) => {
                    const item = await strapi.service("api::item.item").findOne(product.id);
                    if (!item) {
                        throw new Error(`Item not found for ID: ${product.id}`);
                    }

                    return{
                        price_data: {
                            currency: "usd",
                            product_data: {
                                name: item.name
                            },
                            unit_amount: item.price * 100,
                        },
                        quantity: product.count,
                    }
                })
            )

             // Log the created session details
             
             // create a stripe session (payment)
             

          
             const session = await stripe.checkout.sessions.create({
                 payment_method_types: ["card"],
                 customer_email: email,
                 mode: "payment",
                 success_url: `${process.env.FRONTEND_URL}/checkout/success`,
                 cancel_url: process.env.FRONTEND_URL,
                 line_items : lineItems
                 
                })
                //  console.log(process.env.FRONTEND_URL);

                console.log("Stripe session created:", session);
            
            

            // create the item (in strapi)
            await strapi.service("api::order.order").create({
                data: {userName, products, stripeSessionId: session.id},
            })

            // return the session id
            return {id: session.id}
        }
        catch(error) {
            console.error("Error creating order:", error); 
            ctx.response.status = 500;
            return {error: {message: "there was a problem creating the charge"}}
        }
    }
}));
