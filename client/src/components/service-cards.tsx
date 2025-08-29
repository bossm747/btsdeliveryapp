import { Card, CardContent } from "@/components/ui/card";
import { Utensils, ShoppingBag, CreditCard, Package } from "lucide-react";

const services = [
  {
    icon: Utensils,
    title: "Food Delivery",
    description: "Masasarap na pagkain mula sa mga kilalang restaurants sa Batangas",
    color: "bg-primary/10 text-primary"
  },
  {
    icon: ShoppingBag,
    title: "Pabili Service",
    description: "Hindi kayo makakapunta sa store? Kami na ang bibili para sa inyo",
    color: "bg-secondary/10 text-secondary"
  },
  {
    icon: CreditCard,
    title: "Pabayad Service",
    description: "Mga bills at payments, kami na ang mag-aasikaso",
    color: "bg-accent/20 text-accent"
  },
  {
    icon: Package,
    title: "Parcel Delivery",
    description: "Mabilis at secure na parcel delivery sa buong Batangas",
    color: "bg-green-100 text-green-600"
  }
];

export default function ServiceCards() {
  return (
    <section className="py-16 bg-white" data-testid="services-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4" data-testid="services-title">
            Mga Serbisyo Namin
          </h2>
          <p className="text-xl text-muted-foreground" data-testid="services-description">
            Kumpleto ang lahat para sa inyong pangangailangan
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <Card 
              key={service.title} 
              className="service-card cursor-pointer hover:shadow-lg transition-all duration-200"
              data-testid={`service-card-${index}`}
            >
              <CardContent className="p-8 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${service.color}`}>
                  <service.icon size={32} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2" data-testid={`service-title-${index}`}>
                  {service.title}
                </h3>
                <p className="text-muted-foreground" data-testid={`service-description-${index}`}>
                  {service.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
