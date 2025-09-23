import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Sparkles, 
  ImageIcon, 
  TrendingUp, 
  DollarSign, 
  Share2, 
  MessageCircle,
  BarChart3,
  Lightbulb,
  Copy,
  Download,
  RefreshCw,
  Wand2
} from "lucide-react";

export default function AIAssistant() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("content");

  // Content Generation State
  const [menuForm, setMenuForm] = useState({
    itemName: "",
    category: "",
    ingredients: ""
  });
  const [businessForm, setBusinessForm] = useState({
    businessName: "",
    cuisineType: "",
    specialties: ""
  });

  // Image Generation State
  const [imageForm, setImageForm] = useState({
    itemName: "",
    description: ""
  });
  const [bannerForm, setBannerForm] = useState({
    businessName: "",
    promotion: "",
    colors: "#ff6b35,#ffffff"
  });

  // Marketing State
  const [socialForm, setSocialForm] = useState({
    businessName: "",
    postType: "general" as "new_item" | "promotion" | "general",
    content: {}
  });
  const [reviewForm, setReviewForm] = useState({
    reviewText: "",
    rating: 5,
    businessName: ""
  });

  // Analytics State
  const [analyticsForm, setAnalyticsForm] = useState({
    period: "week"
  });

  // Get vendor restaurant for context
  const { data: restaurant } = useQuery({
    queryKey: ["/api/vendor/restaurant"],
  });

  // AI API Mutations
  const generateMenuDescription = useMutation({
    mutationFn: async (data: typeof menuForm) =>
      apiRequest("/api/ai/menu-description", "POST", {
        itemName: data.itemName,
        category: data.category,
        ingredients: data.ingredients ? data.ingredients.split(",").map(i => i.trim()) : undefined
      }),
    onSuccess: (data) => {
      toast({
        title: "Description Generated!",
        description: "AI has created a compelling menu description for you.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate menu description. Please try again.",
      });
    }
  });

  const generateBusinessDescription = useMutation({
    mutationFn: async (data: typeof businessForm) =>
      apiRequest("/api/ai/business-description", "POST", {
        businessName: data.businessName,
        cuisineType: data.cuisineType,
        specialties: data.specialties.split(",").map(s => s.trim())
      }),
    onSuccess: (data) => {
      toast({
        title: "Business Description Created!",
        description: "AI has generated a professional business description.",
      });
    }
  });

  const generateMenuImage = useMutation({
    mutationFn: async (data: typeof imageForm) =>
      apiRequest("/api/ai/menu-image", "POST", data),
    onSuccess: () => {
      toast({
        title: "Image Generated!",
        description: "Professional menu item photo has been created.",
      });
    }
  });

  const generatePromoBanner = useMutation({
    mutationFn: async (data: typeof bannerForm) =>
      apiRequest("/api/ai/promotional-banner", "POST", {
        ...data,
        colors: data.colors.split(",").map(c => c.trim())
      }),
    onSuccess: () => {
      toast({
        title: "Banner Created!",
        description: "Professional promotional banner has been generated.",
      });
    }
  });

  const generateSocialPost = useMutation({
    mutationFn: async (data: typeof socialForm) =>
      apiRequest("/api/ai/social-media-post", "POST", data),
    onSuccess: () => {
      toast({
        title: "Social Post Ready!",
        description: "AI has created an engaging social media post.",
      });
    }
  });

  const generateReviewResponse = useMutation({
    mutationFn: async (data: typeof reviewForm) =>
      apiRequest("/api/ai/review-response", "POST", data),
    onSuccess: () => {
      toast({
        title: "Response Generated!",
        description: "Professional review response has been created.",
      });
    }
  });

  const analyzeSales = useMutation({
    mutationFn: async (data: typeof analyticsForm) =>
      apiRequest("/api/ai/sales-analysis", "POST", data),
    onSuccess: () => {
      toast({
        title: "Analysis Complete!",
        description: "AI has analyzed your sales data and provided insights.",
      });
    }
  });

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard.",
    });
  };

  return (
    <div className="space-y-6" data-testid="ai-assistant-page">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          <p className="text-muted-foreground">
            Supercharge your restaurant with AI-powered tools for content, images, and insights.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Images
          </TabsTrigger>
          <TabsTrigger value="marketing" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Marketing
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Content Generation Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Menu Description Generator */}
            <Card data-testid="menu-description-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Menu Description Generator
                </CardTitle>
                <CardDescription>
                  Create appetizing descriptions that make customers crave your dishes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemName">Item Name</Label>
                    <Input
                      id="itemName"
                      placeholder="Grilled Chicken Breast"
                      value={menuForm.itemName}
                      onChange={(e) => setMenuForm({...menuForm, itemName: e.target.value})}
                      data-testid="input-item-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={menuForm.category} 
                      onValueChange={(value) => setMenuForm({...menuForm, category: value})}
                    >
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="appetizers">Appetizers</SelectItem>
                        <SelectItem value="main-course">Main Course</SelectItem>
                        <SelectItem value="desserts">Desserts</SelectItem>
                        <SelectItem value="beverages">Beverages</SelectItem>
                        <SelectItem value="sides">Sides</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ingredients">Key Ingredients (optional)</Label>
                  <Input
                    id="ingredients"
                    placeholder="herbs, garlic, lemon, olive oil"
                    value={menuForm.ingredients}
                    onChange={(e) => setMenuForm({...menuForm, ingredients: e.target.value})}
                    data-testid="input-ingredients"
                  />
                </div>
                <Button 
                  onClick={() => generateMenuDescription.mutate(menuForm)}
                  disabled={generateMenuDescription.isPending || !menuForm.itemName || !menuForm.category}
                  className="w-full"
                  data-testid="button-generate-description"
                >
                  {generateMenuDescription.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Generate Description
                </Button>
                {generateMenuDescription.data && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Generated Description:</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(generateMenuDescription.data.description)}
                        data-testid="button-copy-description"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-sm" data-testid="text-generated-description">
                      {generateMenuDescription.data.description}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Description Generator */}
            <Card data-testid="business-description-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Business Description Generator
                </CardTitle>
                <CardDescription>
                  Create professional, SEO-optimized business descriptions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    placeholder={restaurant?.name || "Your Restaurant Name"}
                    value={businessForm.businessName}
                    onChange={(e) => setBusinessForm({...businessForm, businessName: e.target.value})}
                    data-testid="input-business-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuisineType">Cuisine Type</Label>
                  <Input
                    id="cuisineType"
                    placeholder="Filipino, Italian, Chinese, etc."
                    value={businessForm.cuisineType}
                    onChange={(e) => setBusinessForm({...businessForm, cuisineType: e.target.value})}
                    data-testid="input-cuisine-type"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialties">Key Specialties</Label>
                  <Input
                    id="specialties"
                    placeholder="Fresh seafood, wood-fired pizza, traditional recipes"
                    value={businessForm.specialties}
                    onChange={(e) => setBusinessForm({...businessForm, specialties: e.target.value})}
                    data-testid="input-specialties"
                  />
                </div>
                <Button 
                  onClick={() => generateBusinessDescription.mutate(businessForm)}
                  disabled={generateBusinessDescription.isPending || !businessForm.businessName || !businessForm.cuisineType}
                  className="w-full"
                  data-testid="button-generate-business-description"
                >
                  {generateBusinessDescription.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Generate Business Description
                </Button>
                {generateBusinessDescription.data && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Generated Description:</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(generateBusinessDescription.data.description)}
                        data-testid="button-copy-business-description"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-sm" data-testid="text-generated-business-description">
                      {generateBusinessDescription.data.description}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Image Generation Tab */}
        <TabsContent value="images" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Menu Item Image Generator */}
            <Card data-testid="menu-image-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Menu Item Image Generator
                </CardTitle>
                <CardDescription>
                  Create professional food photography for your menu items
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="imageItemName">Item Name</Label>
                  <Input
                    id="imageItemName"
                    placeholder="Crispy Fried Chicken"
                    value={imageForm.itemName}
                    onChange={(e) => setImageForm({...imageForm, itemName: e.target.value})}
                    data-testid="input-image-item-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageDescription">Description</Label>
                  <Textarea
                    id="imageDescription"
                    placeholder="Golden crispy chicken served with herbs and garnish"
                    value={imageForm.description}
                    onChange={(e) => setImageForm({...imageForm, description: e.target.value})}
                    data-testid="textarea-image-description"
                  />
                </div>
                <Button 
                  onClick={() => generateMenuImage.mutate(imageForm)}
                  disabled={generateMenuImage.isPending || !imageForm.itemName || !imageForm.description}
                  className="w-full"
                  data-testid="button-generate-image"
                >
                  {generateMenuImage.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Generate Professional Image
                </Button>
                {generateMenuImage.data && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-sm font-medium">Generated Image:</Label>
                    <div className="relative group">
                      <img
                        src={generateMenuImage.data.imageUrl}
                        alt="Generated menu item"
                        className="w-full rounded-lg border"
                        data-testid="img-generated-menu"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => window.open(generateMenuImage.data.imageUrl, '_blank')}
                          data-testid="button-download-image"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Promotional Banner Generator */}
            <Card data-testid="promo-banner-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Promotional Banner Generator
                </CardTitle>
                <CardDescription>
                  Create eye-catching banners for promotions and social media
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bannerBusinessName">Business Name</Label>
                  <Input
                    id="bannerBusinessName"
                    placeholder={restaurant?.name || "Your Restaurant"}
                    value={bannerForm.businessName}
                    onChange={(e) => setBannerForm({...bannerForm, businessName: e.target.value})}
                    data-testid="input-banner-business-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promotion">Promotion Details</Label>
                  <Input
                    id="promotion"
                    placeholder="50% Off All Main Courses This Week!"
                    value={bannerForm.promotion}
                    onChange={(e) => setBannerForm({...bannerForm, promotion: e.target.value})}
                    data-testid="input-promotion"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="colors">Color Scheme (comma separated)</Label>
                  <Input
                    id="colors"
                    placeholder="#ff6b35, #ffffff, #333333"
                    value={bannerForm.colors}
                    onChange={(e) => setBannerForm({...bannerForm, colors: e.target.value})}
                    data-testid="input-colors"
                  />
                </div>
                <Button 
                  onClick={() => generatePromoBanner.mutate(bannerForm)}
                  disabled={generatePromoBanner.isPending || !bannerForm.businessName || !bannerForm.promotion}
                  className="w-full"
                  data-testid="button-generate-banner"
                >
                  {generatePromoBanner.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Generate Promotional Banner
                </Button>
                {generatePromoBanner.data && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-sm font-medium">Generated Banner:</Label>
                    <div className="relative group">
                      <img
                        src={generatePromoBanner.data.imageUrl}
                        alt="Generated promotional banner"
                        className="w-full rounded-lg border"
                        data-testid="img-generated-banner"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => window.open(generatePromoBanner.data.imageUrl, '_blank')}
                          data-testid="button-download-banner"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Marketing Tab */}
        <TabsContent value="marketing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Social Media Post Generator */}
            <Card data-testid="social-media-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Social Media Post Generator
                </CardTitle>
                <CardDescription>
                  Create engaging posts for Facebook, Instagram, and more
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="socialBusinessName">Business Name</Label>
                  <Input
                    id="socialBusinessName"
                    placeholder={restaurant?.name || "Your Restaurant"}
                    value={socialForm.businessName}
                    onChange={(e) => setSocialForm({...socialForm, businessName: e.target.value})}
                    data-testid="input-social-business-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postType">Post Type</Label>
                  <Select 
                    value={socialForm.postType} 
                    onValueChange={(value: any) => setSocialForm({...socialForm, postType: value})}
                  >
                    <SelectTrigger data-testid="select-post-type">
                      <SelectValue placeholder="Select post type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_item">New Menu Item</SelectItem>
                      <SelectItem value="promotion">Promotion/Special</SelectItem>
                      <SelectItem value="general">General Business Post</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => generateSocialPost.mutate(socialForm)}
                  disabled={generateSocialPost.isPending || !socialForm.businessName || !socialForm.postType}
                  className="w-full"
                  data-testid="button-generate-social-post"
                >
                  {generateSocialPost.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Generate Social Media Post
                </Button>
                {generateSocialPost.data && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Caption:</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generateSocialPost.data.caption)}
                          data-testid="button-copy-caption"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-sm" data-testid="text-social-caption">
                        {generateSocialPost.data.caption}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Hashtags:</Label>
                      <div className="flex flex-wrap gap-1" data-testid="container-hashtags">
                        {generateSocialPost.data.hashtags.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Call to Action:</Label>
                      <div className="p-2 bg-primary/10 rounded text-sm font-medium" data-testid="text-call-to-action">
                        {generateSocialPost.data.callToAction}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Review Response Generator */}
            <Card data-testid="review-response-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Review Response Generator
                </CardTitle>
                <CardDescription>
                  Generate professional responses to customer reviews
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reviewBusinessName">Business Name</Label>
                  <Input
                    id="reviewBusinessName"
                    placeholder={restaurant?.name || "Your Restaurant"}
                    value={reviewForm.businessName}
                    onChange={(e) => setReviewForm({...reviewForm, businessName: e.target.value})}
                    data-testid="input-review-business-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewText">Customer Review</Label>
                  <Textarea
                    id="reviewText"
                    placeholder="The food was amazing! Great service and atmosphere..."
                    value={reviewForm.reviewText}
                    onChange={(e) => setReviewForm({...reviewForm, reviewText: e.target.value})}
                    data-testid="textarea-review-text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating">Rating</Label>
                  <Select 
                    value={reviewForm.rating.toString()} 
                    onValueChange={(value) => setReviewForm({...reviewForm, rating: parseInt(value)})}
                  >
                    <SelectTrigger data-testid="select-rating">
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 Stars</SelectItem>
                      <SelectItem value="4">4 Stars</SelectItem>
                      <SelectItem value="3">3 Stars</SelectItem>
                      <SelectItem value="2">2 Stars</SelectItem>
                      <SelectItem value="1">1 Star</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => generateReviewResponse.mutate(reviewForm)}
                  disabled={generateReviewResponse.isPending || !reviewForm.businessName || !reviewForm.reviewText}
                  className="w-full"
                  data-testid="button-generate-review-response"
                >
                  {generateReviewResponse.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Generate Response
                </Button>
                {generateReviewResponse.data && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Generated Response:</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(generateReviewResponse.data.response)}
                        data-testid="button-copy-review-response"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-sm" data-testid="text-review-response">
                      {generateReviewResponse.data.response}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card data-testid="analytics-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                AI Sales Analytics
              </CardTitle>
              <CardDescription>
                Get AI-powered insights and recommendations for your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="analyticsPeriod">Analysis Period</Label>
                <Select 
                  value={analyticsForm.period} 
                  onValueChange={(value) => setAnalyticsForm({...analyticsForm, period: value})}
                >
                  <SelectTrigger data-testid="select-analytics-period">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Last 24 Hours</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="quarter">Last Quarter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => analyzeSales.mutate(analyticsForm)}
                disabled={analyzeSales.isPending}
                className="w-full"
                data-testid="button-analyze-sales"
              >
                {analyzeSales.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                Analyze Sales Data
              </Button>
              {analyzeSales.data && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Key Insights:</Label>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm" data-testid="text-insights">
                      {analyzeSales.data.insights}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Recommendations:</Label>
                    <ul className="space-y-1" data-testid="list-recommendations">
                      {analyzeSales.data.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm p-2 bg-green-50 border border-green-200 rounded">
                          <Lightbulb className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Trends:</Label>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm" data-testid="text-trends">
                      {analyzeSales.data.trends}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}