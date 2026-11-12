// Single-source abelian sandpile on Z^2 (grid large enough that nothing reaches the edge).
// Mode "bulk N": drop N grains at center at once, stabilize with multi-topple, report
//   total topplings T(N) (= sum of odometer, order-independent), radius, height histogram.
// Mode "seq N": add grains one by one, log avalanche size of each grain from N/2..N.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#define S 1601
static long long h[S*S];
static int stk[S*S*2]; static char inq[S*S];
int main(int argc,char**argv){
  int seq=strcmp(argv[1],"seq")==0; long long N=atoll(argv[2]); int c=S/2*S+S/2;
  long long T=0; int sp=0;
  if(!seq){
    h[c]=N; stk[sp++]=c; inq[c]=1;
    while(sp){int i=stk[--sp]; inq[i]=0; long long k=h[i]/4; if(!k)continue;
      h[i]-=4*k; T+=k; int nb[4]={i+1,i-1,i+S,i-S};
      for(int j=0;j<4;j++){int n=nb[j]; h[n]+=k; if(h[n]>=4&&!inq[n]){inq[n]=1;stk[sp++]=n;}}}
  } else {
    for(long long g=1;g<=N;g++){ long long a=0; h[c]++; if(h[c]>=4){stk[sp++]=c;inq[c]=1;}
      while(sp){int i=stk[--sp]; inq[i]=0; long long k=h[i]/4; if(!k)continue;
        h[i]-=4*k; a+=k; int nb[4]={i+1,i-1,i+S,i-S};
        for(int j=0;j<4;j++){int n=nb[j]; h[n]+=k; if(h[n]>=4&&!inq[n]){inq[n]=1;stk[sp++]=n;}}}
      T+=a; if(g>N/2) printf("A %lld\n",a);}
  }
  long long cnt[4]={0}; double r=0; int x0=S/2;
  for(int y=0;y<S;y++)for(int x=0;x<S;x++){long long v=h[y*S+x]; if(v){cnt[v]++; double d=hypot(x-x0,y-x0); if(d>r)r=d;}}
  for(int y=0;y<S;y++)for(int x=0;x<S;x++) if(!h[y*S+x]&&hypot(x-x0,y-x0)<r) cnt[0]++;
  printf("N %lld T %lld r %.1f h0 %lld h1 %lld h2 %lld h3 %lld\n",N,T,r,cnt[0],cnt[1],cnt[2],cnt[3]);
}
