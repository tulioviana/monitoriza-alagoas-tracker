
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				'border-hover': 'hsl(var(--border-hover))',
				input: 'hsl(var(--input))',
				'input-focus': 'hsl(var(--input-focus))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					hover: 'hsl(var(--primary-hover))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					hover: 'hsl(var(--secondary-hover))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				error: {
					DEFAULT: 'hsl(var(--error))',
					foreground: 'hsl(var(--error-foreground))'
				},
				info: {
					DEFAULT: 'hsl(var(--info))',
					foreground: 'hsl(var(--info-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					hover: 'hsl(var(--muted-hover))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					hover: 'hsl(var(--accent-hover))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					hover: 'hsl(var(--card-hover))',
					border: 'hsl(var(--card-border))',
					foreground: 'hsl(var(--card-foreground))'
				},
				// Custom Colors for UI/UX improvements
				'page-background': '#F7F8FC',
				'text-title': '#333333',
				'text-description': '#666666',
				'accent-green': '#6A8B77',
				'accent-blue': '#3B526B',
			},
			borderRadius: {
				'sm': 'var(--radius-sm)',
				'md': 'var(--radius-md)', 
				'lg': 'var(--radius-lg)',
				'xl': 'var(--radius-xl)',
				'2xl': 'var(--radius-2xl)',
				'full': 'var(--radius-full)',
				// Custom border radius for cards
				'card-lg': '1rem', // Increased rounding for cards
			},
			spacing: {
				'xs': 'var(--spacing-xs)',
				'sm': 'var(--spacing-sm)',
				'md': 'var(--spacing-md)',
				'lg': 'var(--spacing-lg)',
				'xl': 'var(--spacing-xl)',
				'2xl': 'var(--spacing-2xl)',
				'3xl': 'var(--spacing-3xl)'
			},
			fontSize: {
				'xs': ['var(--font-size-xs)', { lineHeight: 'var(--line-height-normal)' }],
				'sm': ['var(--font-size-sm)', { lineHeight: 'var(--line-height-normal)' }],
				'base': ['var(--font-size-base)', { lineHeight: 'var(--line-height-normal)' }],
				'lg': ['var(--font-size-lg)', { lineHeight: 'var(--line-height-normal)' }],
				'xl': ['var(--font-size-xl)', { lineHeight: 'var(--line-height-tight)' }],
				'2xl': ['var(--font-size-2xl)', { lineHeight: 'var(--line-height-tight)' }],
				'3xl': ['var(--font-size-3xl)', { lineHeight: 'var(--line-height-tight)' }],
				'4xl': ['var(--font-size-4xl)', { lineHeight: 'var(--line-height-tight)' }]
			},
			transitionDuration: {
				'fast': 'var(--duration-fast)',
				'normal': 'var(--duration-normal)', 
				'slow': 'var(--duration-slow)'
			},
			zIndex: {
				'dropdown': 'var(--z-dropdown)',
				'sticky': 'var(--z-sticky)',
				'fixed': 'var(--z-fixed)',
				'modal-backdrop': 'var(--z-modal-backdrop)',
				'modal': 'var(--z-modal)',
				'popover': 'var(--z-popover)',
				'tooltip': 'var(--z-tooltip)',
				'toast': 'var(--z-toast)'
			},
			boxShadow: {
				'soft': 'var(--shadow-sm)',
				'medium': 'var(--shadow-md)',
				'strong': 'var(--shadow-lg)',
				'dramatic': 'var(--shadow-xl)',
				// Custom subtle shadow for cards
				'card-subtle': '0 4px 12px rgba(0, 0, 0, 0.05)',
			},
			keyframes: {
				'fade-in': {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' }
				},
				'fade-in-up': {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'scale-in': {
					'0%': { opacity: '0', transform: 'scale(0.95)' },
					'100%': { opacity: '1', transform: 'scale(1)' }
				},
				'slide-in-right': {
					'0%': { opacity: '0', transform: 'translateX(20px)' },
					'100%': { opacity: '1', transform: 'translateX(0)' }
				},
				'pulse-glow': {
					'0%, 100%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
					'50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' }
				},
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				}
			},
			animation: {
				'fade-in': 'fade-in var(--duration-normal) ease-out',
				'fade-in-up': 'fade-in-up var(--duration-normal) ease-out',
				'scale-in': 'scale-in var(--duration-fast) ease-out',
				'slide-in-right': 'slide-in-right var(--duration-normal) ease-out',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			},
			backdropBlur: {
				'xs': '2px',
				'sm': '4px',
				'md': '8px',
				'lg': '12px',
				'xl': '16px'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
