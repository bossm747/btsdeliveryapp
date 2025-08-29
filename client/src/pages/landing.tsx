import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Clock, 
  Star, 
  Users, 
  Truck, 
  ShoppingBag, 
  CreditCard,
  ArrowRight,
  CheckCircle,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Twitter
} from "lucide-react";

export default function Landing() {
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const services = [
    {
      id: "delivery",
      title: "Food Delivery",
      description: "Pagkain mula sa mga paboritong restaurant mo",
      icon: ShoppingBag,
      color: "from-[#FF6B35] to-[#FFD23F]",
      features: ["30-min delivery", "100+ restaurants", "Real-time tracking"]
    },
    {
      id: "pabili",
      title: "Pabili Service",
      description: "Grocery at shopping assistance para sa'yo",
      icon: Users,
      color: "from-[#004225] to-green-600",
      features: ["Personal shopper", "Same-day delivery", "No minimum order"]
    },
    {
      id: "pabayad",
      title: "Pabayad Service",
      description: "Bills payment at remittance services",
      icon: CreditCard,
      color: "from-blue-600 to-purple-600",
      features: ["Bills payment", "Money transfer", "24/7 service"]
    },
    {
      id: "parcel",
      title: "Parcel Delivery",
      description: "Secure package delivery across Batangas",
      icon: Truck,
      color: "from-purple-600 to-pink-600",
      features: ["Same-day delivery", "Package tracking", "Secure handling"]
    }
  ];

  const stats = [
    { label: "Active Users", value: "50K+", icon: Users },
    { label: "Partner Restaurants", value: "500+", icon: ShoppingBag },
    { label: "Riders", value: "1,000+", icon: Truck },
    { label: "Cities Covered", value: "15+", icon: MapPin }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50" data-testid="page-landing">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B35] to-[#FFD23F] rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#004225]">BTS Delivery</h1>
                <p className="text-xs text-gray-600">Batangas Province</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Link href="/login">
                <Button variant="outline" className="border-[#004225] text-[#004225] hover:bg-[#004225] hover:text-white" data-testid="button-login">
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] text-white hover:opacity-90" data-testid="button-signup">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <Badge className="bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] text-white border-0 mb-6">
              #1 Delivery Platform sa Batangas
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-[#004225] mb-6 leading-tight">
              Lahat ng kailangan mo,
              <span className="bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] bg-clip-text text-transparent">
                {" "}delivered sa'yo
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Food delivery, pabili service, pabayad, at parcel delivery - lahat dito na!
              Serving the entire Batangas Province with love and care.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/signup?role=customer">
                <Button size="lg" className="bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] text-white hover:opacity-90 text-lg px-8 py-4" data-testid="button-get-started">
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Start Ordering
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/signup?role=rider">
                <Button size="lg" variant="outline" className="border-[#004225] text-[#004225] hover:bg-[#004225] hover:text-white text-lg px-8 py-4" data-testid="button-become-rider">
                  <Truck className="w-5 h-5 mr-2" />
                  Become a Rider
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-6 text-center">
                      <Icon className="w-8 h-8 mx-auto mb-2 text-[#FF6B35]" />
                      <div className="text-2xl font-bold text-[#004225]">{stat.value}</div>
                      <div className="text-sm text-gray-600">{stat.label}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-4 bg-white/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#004225] mb-4">
              Mga Serbisyo Namin
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose from our comprehensive delivery and service solutions designed for Batangas families.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => {
              const Icon = service.icon;
              const isSelected = selectedService === service.id;
              
              return (
                <Card 
                  key={service.id}
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 border-0 shadow-xl ${
                    isSelected ? 'ring-2 ring-[#FF6B35] ring-offset-2' : ''
                  }`}
                  onClick={() => setSelectedService(isSelected ? null : service.id)}
                  data-testid={`card-service-${service.id}`}
                >
                  <CardHeader className="text-center pb-2">
                    <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-[#004225] text-xl">{service.title}</CardTitle>
                    <CardDescription className="text-gray-600">
                      {service.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <ul className="space-y-2">
                      {service.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#004225] to-green-800">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto text-white">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Ready to get started?
            </h2>
            <p className="text-xl opacity-90 mb-8">
              Join thousands of satisfied customers across Batangas Province
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {[
                { title: "Para sa Customers", desc: "Order food, pabili, at iba pa", href: "/signup?role=customer" },
                { title: "Para sa Restaurants", desc: "Partner with us to grow your business", href: "/signup?role=vendor" },
                { title: "Para sa Riders", desc: "Earn money with flexible schedule", href: "/signup?role=rider" }
              ].map((cta, index) => (
                <Link key={index} href={cta.href}>
                  <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <h3 className="font-semibold text-lg mb-2">{cta.title}</h3>
                      <p className="text-sm opacity-75 mb-4">{cta.desc}</p>
                      <ArrowRight className="w-5 h-5 mx-auto" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#004225] text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B35] to-[#FFD23F] rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg">BTS Delivery</span>
              </div>
              <p className="text-sm opacity-75 mb-4">
                Your trusted delivery partner across Batangas Province
              </p>
              <div className="flex space-x-3">
                <Facebook className="w-5 h-5 opacity-75 hover:opacity-100 cursor-pointer" />
                <Instagram className="w-5 h-5 opacity-75 hover:opacity-100 cursor-pointer" />
                <Twitter className="w-5 h-5 opacity-75 hover:opacity-100 cursor-pointer" />
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-sm opacity-75">
                <li>Food Delivery</li>
                <li>Pabili Service</li>
                <li>Pabayad Service</li>
                <li>Parcel Delivery</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm opacity-75">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Terms of Service</li>
                <li>Privacy Policy</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-sm opacity-75">
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  +63 912 345 6789
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  support@btsdelivery.ph
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Batangas Province, Philippines
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 mt-8 pt-8 text-center text-sm opacity-75">
            <p>&copy; 2024 BTS Delivery. All rights reserved. | Privacy Policy | Terms of Service</p>
          </div>
        </div>
      </footer>
    </div>
  );
}