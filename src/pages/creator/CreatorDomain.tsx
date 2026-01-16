import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Globe, Copy, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const CreatorDomain = () => {
  const queryClient = useQueryClient();
  const { data: creator } = useMyCreator();
  const [domain, setDomain] = useState('');

  const defaultUrl = `${window.location.origin}/${creator?.username}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(defaultUrl);
    toast.success('Link copied!');
  };

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Custom Domain</h1>
          <p className="text-muted-foreground mt-1">Use your own domain for your creator page</p>
        </div>

        {/* Default URL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Your TribeYangu URL
            </CardTitle>
            <CardDescription>This is your default page URL that always works</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input value={defaultUrl} readOnly className="flex-1" />
              <Button variant="outline" onClick={copyUrl}>
                <Copy className="w-4 h-4" />
              </Button>
              <a href={defaultUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Custom Domain Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Custom Domain Setup
              <Badge variant="secondary">Coming Soon</Badge>
            </CardTitle>
            <CardDescription>Connect your own domain to your creator page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>How Custom Domains Work</AlertTitle>
              <AlertDescription>
                Custom domains allow you to use your own domain (e.g., yourname.com) instead of tribeyangu.com/@yourname
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h4 className="font-semibold">Setup Instructions:</h4>
              
              <div className="space-y-3">
                <div className="flex gap-3 p-4 rounded-lg bg-secondary/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <p className="font-medium">Purchase a Domain</p>
                    <p className="text-sm text-muted-foreground">
                      Buy a domain from a registrar like Namecheap, GoDaddy, or Google Domains
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-4 rounded-lg bg-secondary/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <p className="font-medium">Configure DNS Records</p>
                    <p className="text-sm text-muted-foreground">
                      Add these DNS records at your domain registrar:
                    </p>
                    <div className="mt-2 p-3 rounded bg-muted font-mono text-xs space-y-1">
                      <p>A Record: @ → 185.158.133.1</p>
                      <p>A Record: www → 185.158.133.1</p>
                      <p>TXT Record: _lovable → lovable_verify=[your-code]</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 p-4 rounded-lg bg-secondary/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <p className="font-medium">Enter Your Domain Below</p>
                    <p className="text-sm text-muted-foreground">
                      Once DNS is configured, enter your domain and we'll verify it
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-4 rounded-lg bg-secondary/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">4</div>
                  <div>
                    <p className="font-medium">Wait for DNS Propagation</p>
                    <p className="text-sm text-muted-foreground">
                      DNS changes can take up to 48 hours to propagate worldwide
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Domain Input */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Your Custom Domain</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="yourdomain.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                  />
                  <Button disabled>
                    Verify Domain
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your domain without http:// or www
                </p>
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Need Help?</AlertTitle>
              <AlertDescription className="text-blue-700">
                Custom domains are a premium feature. Contact support for assistance with setup or check our{' '}
                <a href="https://docs.lovable.dev/features/custom-domain" target="_blank" rel="noopener noreferrer" className="underline">
                  documentation
                </a>.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CreatorDomain;
